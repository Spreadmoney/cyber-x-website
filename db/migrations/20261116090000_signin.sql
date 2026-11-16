-- ===========================================================================
-- M2 Sign-in, part 1: sign in and sign out (ACC 4.01–4.03b, 4.02c, 1.01c)
--
--   This phone   A phone is recognised by a secret it holds in a cookie (the
--                database keeps only its hash). Only the account's active
--                phone can sign in here; any other phone goes through
--                "new phone" (ACC 6), never straight in. (CBN: one active
--                device.)
--   Passkey      The phone's own unlock, checked by the server against the
--                passkey made at sign-up: our address only, the person
--                verified, the signature counter moving forward. (FIDO2)
--   Password     Compared with the Argon2id hash by the server. 5 wrong in a
--                row locks password sign-in for 15 minutes; each further
--                lock within 24 hours of the last doubles, up to 24 hours.
--                (NIST SP 800-63B 5.2.2, OWASP ASVS 2.2.1)
--   Leaks        A password sign-up couldn't check against known leaks is
--                checked at sign-in; a leaked one must be changed before
--                anything else.
--   Sessions     A secret in a cookie, hash in the database. Ends after 30
--                minutes unused or 12 hours in all, and at sign-out.
--                (NIST SP 800-63B 7.2, AAL2)
--
-- Everything is written to the audit log.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- The secret each phone holds
-- ---------------------------------------------------------------------------

-- Kept apart from public.devices, which people can read: nothing here is
-- ever readable through the app.
create table public.device_keys (
  device_id uuid primary key references public.devices (id) on delete cascade,
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  -- The one-time challenge for a passkey sign-in on this phone, if any.
  challenge text check (challenge is null or challenge ~ '^[A-Za-z0-9_-]{16,128}$'),
  challenge_at timestamptz,
  created_at timestamptz not null default now(),
  check ((challenge is null) = (challenge_at is null))
);

comment on table public.device_keys is
  'The hash of the secret each phone holds, and its passkey challenge. Server only.';

alter table public.device_keys enable row level security;
revoke all on public.device_keys from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid references public.devices (id) on delete set null,
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  method text not null check (method in ('passkey', 'password')),
  -- The password was found in a known leak: nothing but changing it.
  password_leaked boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- 12 hours from sign-in, however much it is used.
  expires_at timestamptz not null,
  ended_at timestamptz,
  ended_reason text check (ended_reason in (
    'signed_out', 'expired', 'idle', 'password_changed', 'account_unavailable', 'phone_replaced'
  )),
  check ((ended_at is null) = (ended_reason is null))
);

create index sessions_live_by_user on public.sessions (user_id) where ended_at is null;

comment on table public.sessions is
  'Signed-in sessions. The cookie holds the secret; this keeps its hash. Server only.';

alter table public.sessions enable row level security;
revoke all on public.sessions from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Wrong passwords and locks
-- ---------------------------------------------------------------------------

create table public.signin_guards (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- Wrong passwords in a row since the last success or lock.
  failures smallint not null default 0 check (failures between 0 and 4),
  locked_until timestamptz,
  -- How many locks in a row, each within 24 hours of the one before.
  lock_level smallint not null default 0 check (lock_level between 0 and 20),
  last_locked_at timestamptz
);

comment on table public.signin_guards is
  'Wrong-password counts and sign-in locks, one row per person. Server only.';

alter table public.signin_guards enable row level security;
revoke all on public.signin_guards from public, anon, authenticated;

-- The numbers, in one place.
create function public.signin_rules()
returns table (
  tries integer,
  first_lock interval,
  longest_lock interval,
  idle interval,
  longest_session interval,
  challenge_life interval
)
language sql
immutable
set search_path = ''
as $$
  select 5, interval '15 minutes', interval '24 hours',
         interval '30 minutes', interval '12 hours', interval '2 minutes'
$$;

-- ---------------------------------------------------------------------------
-- Giving the new account's phone its secret (end of sign-up, ACC 2.07)
-- ---------------------------------------------------------------------------

-- Called with signup_create_account, in the same transaction.
create function public.signup_bind_device(hash bytea, device_token_hash bytea)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid := public.signup_owner(hash);
  phone uuid;
begin
  if device_token_hash is null or octet_length(device_token_hash) <> 32 then
    raise exception 'A phone''s secret must arrive as a 32-byte hash.' using errcode = '22023';
  end if;
  select d.id into phone from public.devices d where d.user_id = owner and d.is_active;
  if phone is null then
    raise exception 'This account has no active phone.' using errcode = '42501';
  end if;
  if exists (select 1 from public.device_keys k where k.device_id = phone) then
    raise exception 'This phone already has its secret.' using errcode = '42501';
  end if;
  insert into public.device_keys (device_id, token_hash) values (phone, device_token_hash);
end;
$$;

-- ---------------------------------------------------------------------------
-- Which account this phone belongs to (ACC 4.01, 4.02, 4.02b, 4.02c)
-- ---------------------------------------------------------------------------

-- No rows: this browser has never held an account (or its secret is unknown).
create function public.signin_device(device_token_hash bytea)
returns table (
  user_id uuid,
  display_name text,
  -- False once another phone has become the account's active phone.
  device_active boolean,
  has_passkey boolean,
  account_status public.account_status,
  locked_until timestamptz,
  -- Never signed in yet: the first sign-in after sign-up (ACC 4.02c).
  first_sign_in boolean
)
language sql
security definer
stable
set search_path = ''
as $$
  select p.id, p.display_name, d.is_active,
         exists (select 1 from public.passkeys k where k.device_id = d.id),
         p.status,
         (select g.locked_until from public.signin_guards g
           where g.user_id = p.id and g.locked_until > now()),
         not exists (select 1 from public.sessions s where s.user_id = p.id)
    from public.device_keys dk
    join public.devices d on d.id = dk.device_id
    join public.profiles p on p.id = d.user_id
   where dk.token_hash = device_token_hash
$$;

-- The phone and account behind a secret, if this phone may sign in now.
-- Locks the device's key row, so one phone's sign-ins run one at a time.
create function public.signin_phone(device_token_hash bytea)
returns table (device_id uuid, user_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  phone uuid;
  owner uuid;
  active boolean;
  state public.account_status;
begin
  select d.id, d.user_id, d.is_active, p.status
    into phone, owner, active, state
    from public.device_keys dk
    join public.devices d on d.id = dk.device_id
    join public.profiles p on p.id = d.user_id
   where dk.token_hash = device_token_hash
     for update of dk;
  if phone is null or not active then
    raise exception 'This phone can''t sign in here.' using errcode = '42501';
  end if;
  if state <> 'active' then
    raise exception 'This account can''t be signed in to.' using errcode = '42501';
  end if;
  return query select phone, owner;
end;
$$;

-- A new session for a person on a phone; returns when it can last until.
create function public.signin_new_session(
  owner uuid,
  phone uuid,
  session_token_hash bytea,
  how text,
  leaked boolean
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  ends timestamptz := now() + (select longest_session from public.signin_rules());
begin
  if session_token_hash is null or octet_length(session_token_hash) <> 32 then
    raise exception 'A session''s secret must arrive as a 32-byte hash.' using errcode = '22023';
  end if;
  insert into public.sessions (user_id, device_id, token_hash, method, password_leaked, expires_at)
  values (owner, phone, session_token_hash, how, leaked, ends);
  update public.devices set last_seen_at = now() where id = phone;
  insert into public.signin_guards (user_id) values (owner)
  on conflict on constraint signin_guards_pkey do update set failures = 0;
  insert into public.audit_log (actor_id, subject_id, action, details, device_id)
  values (owner, owner, 'signin.succeeded',
          jsonb_build_object('method', how, 'password_leaked', leaked), phone);
  return ends;
end;
$$;

-- ---------------------------------------------------------------------------
-- Passkey sign-in (ACC 4.01, 4.02c)
-- ---------------------------------------------------------------------------

-- Remembers the challenge for this phone and returns its passkeys.
create function public.signin_passkey_begin(device_token_hash bytea, new_challenge text)
returns table (credential_id text, transports text[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  phone uuid;
begin
  select s.device_id into phone from public.signin_phone(device_token_hash) s;
  if new_challenge is null or new_challenge !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'That isn''t a challenge.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.passkeys k where k.device_id = phone) then
    raise exception 'This phone has no passkey.' using errcode = '42501';
  end if;
  update public.device_keys
     set challenge = new_challenge, challenge_at = now()
   where device_id = phone;
  return query
    select k.credential_id, k.transports from public.passkeys k where k.device_id = phone;
end;
$$;

-- What the server needs to check the phone's answer: the passkey's public
-- half and counter, and the challenge if it is still fresh. Taking the
-- challenge uses it up: an answer can be checked once.
create function public.signin_passkey_key(device_token_hash bytea, used_credential_id text)
returns table (public_key bytea, sign_count bigint, challenge text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  phone uuid;
  issued text;
  issued_at timestamptz;
begin
  -- signin_phone locks this phone's key row.
  select s.device_id into phone from public.signin_phone(device_token_hash) s;
  select k.challenge, k.challenge_at into issued, issued_at
    from public.device_keys k where k.device_id = phone;
  update public.device_keys set challenge = null, challenge_at = null where device_id = phone;
  if issued_at is null or issued_at <= now() - (select challenge_life from public.signin_rules()) then
    issued := null;
  end if;
  return query
    select k.public_key, k.sign_count, issued
      from public.passkeys k
     where k.device_id = phone and k.credential_id = used_credential_id;
end;
$$;

-- The phone's answer was genuine: a session. Returns when it ends.
-- The counter must move forward, unless the passkey never counts (many
-- phones keep it at 0); a counter that goes backwards means a copied
-- passkey, so it is refused and recorded.
create function public.signin_passkey_finish(
  device_token_hash bytea,
  used_credential_id text,
  new_sign_count bigint,
  session_token_hash bytea
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  phone uuid;
  owner uuid;
  key public.passkeys%rowtype;
begin
  select s.device_id, s.user_id into phone, owner from public.signin_phone(device_token_hash) s;
  select * into key from public.passkeys k
   where k.device_id = phone and k.credential_id = used_credential_id
     for update;
  if key.id is null then
    raise exception 'That passkey doesn''t belong to this phone.' using errcode = '42501';
  end if;
  if new_sign_count is null or new_sign_count < 0
     or ((key.sign_count > 0 or new_sign_count > 0) and new_sign_count <= key.sign_count) then
    insert into public.audit_log (actor_id, subject_id, action, details, device_id)
    values (null, owner, 'signin.passkey_refused',
            jsonb_build_object('reason', 'counter', 'stored', key.sign_count, 'sent', new_sign_count),
            phone);
    return null;
  end if;
  update public.passkeys
     set sign_count = new_sign_count, last_used_at = now()
   where id = key.id;
  return public.signin_new_session(owner, phone, session_token_hash, 'passkey', false);
end;
$$;

-- An answer that failed the server's checks (wrong site, the person not
-- verified, a forged signature): recorded, nothing else.
create function public.signin_passkey_refused(device_token_hash bytea, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  phone uuid;
  owner uuid;
begin
  select s.device_id, s.user_id into phone, owner from public.signin_phone(device_token_hash) s;
  insert into public.audit_log (actor_id, subject_id, action, details, device_id)
  values (null, owner, 'signin.passkey_refused',
          jsonb_build_object('reason', left(coalesce(reason, 'unknown'), 40)), phone);
end;
$$;

-- ---------------------------------------------------------------------------
-- Password sign-in (ACC 4.03, 4.03b)
-- ---------------------------------------------------------------------------

-- The stored hash, for the server to compare, unless sign-in is locked.
-- Also says whether the password still needs the leak check.
create function public.signin_password_begin(device_token_hash bytea)
returns table (password_hash text, locked_until timestamptz, needs_leak_check boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  lock timestamptz;
begin
  select s.user_id into owner from public.signin_phone(device_token_hash) s;
  select g.locked_until into lock from public.signin_guards g
   where g.user_id = owner and g.locked_until > now();
  if lock is not null then
    return query select null::text, lock, false;
    return;
  end if;
  return query
    select u.encrypted_password::text, null::timestamptz, p.password_unchecked_since is not null
      from auth.users u join public.profiles p on p.id = u.id
     where u.id = owner;
end;
$$;

-- What the comparison found.
--   signed_in   a session (its end in ends_at)
--   wrong       tries_left more before the lock
--   locked      locked until locked_until
-- leaked: true found in a leak, false checked and clean, null not checked.
create function public.signin_password_result(
  device_token_hash bytea,
  correct boolean,
  session_token_hash bytea,
  leaked boolean
)
returns table (outcome text, tries_left integer, locked_until timestamptz, ends_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  phone uuid;
  owner uuid;
  g public.signin_guards%rowtype;
  rules record;
  level smallint;
  until timestamptz;
begin
  select s.device_id, s.user_id into phone, owner from public.signin_phone(device_token_hash) s;
  select * into rules from public.signin_rules();
  insert into public.signin_guards (user_id) values (owner) on conflict do nothing;
  select * into g from public.signin_guards where user_id = owner for update;

  -- Locked meanwhile (another try finished first): the answer doesn't count.
  if g.locked_until > now() then
    return query select 'locked'::text, 0, g.locked_until, null::timestamptz;
    return;
  end if;

  if correct then
    if leaked is false then
      update public.profiles set password_unchecked_since = null where id = owner;
    end if;
    return query select 'signed_in'::text, rules.tries, null::timestamptz,
      public.signin_new_session(owner, phone, session_token_hash, 'password', coalesce(leaked, false));
    return;
  end if;

  if g.failures + 1 < rules.tries then
    update public.signin_guards set failures = failures + 1 where user_id = owner;
    insert into public.audit_log (actor_id, subject_id, action, details, device_id)
    values (null, owner, 'signin.password_wrong',
            jsonb_build_object('tries_left', rules.tries - g.failures - 1), phone);
    return query select 'wrong'::text, rules.tries - g.failures - 1, null::timestamptz, null::timestamptz;
    return;
  end if;

  -- The last try: lock. Longer each time within 24 hours of the last lock.
  level := case when g.last_locked_at > now() - interval '24 hours'
                then least(g.lock_level + 1, 20) else 1 end;
  until := now() + least(rules.first_lock * power(2, level - 1), rules.longest_lock);
  update public.signin_guards
     set failures = 0, locked_until = until, lock_level = level, last_locked_at = now()
   where user_id = owner;
  insert into public.audit_log (actor_id, subject_id, action, details, device_id)
  values (null, owner, 'signin.locked',
          jsonb_build_object('until', until, 'level', level), phone);
  return query select 'locked'::text, 0, until, null::timestamptz;
end;
$$;

-- ---------------------------------------------------------------------------
-- Using a session
-- ---------------------------------------------------------------------------

-- The signed-in person behind a session, and the session kept alive. No
-- rows when it has ended, timed out or the account can't be used; a
-- session found timed out is ended here.
create function public.session_get(session_token_hash bytea)
returns table (
  user_id uuid,
  device_id uuid,
  cyberx_id text,
  alias text,
  display_name text,
  password_leaked boolean,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.sessions%rowtype;
  state public.account_status;
  rules record;
begin
  select * into rules from public.signin_rules();
  select * into s from public.sessions x
   where x.token_hash = session_token_hash and x.ended_at is null
     for update;
  if s.id is null then
    return;
  end if;
  if s.expires_at <= now() or s.last_seen_at <= now() - rules.idle then
    update public.sessions
       set ended_at = now(),
           ended_reason = case when s.expires_at <= now() then 'expired' else 'idle' end
     where id = s.id;
    return;
  end if;
  select p.status into state from public.profiles p where p.id = s.user_id;
  if state <> 'active' then
    update public.sessions set ended_at = now(), ended_reason = 'account_unavailable'
     where id = s.id;
    return;
  end if;
  -- Still the active phone? A session never outlives its phone's place.
  if s.device_id is null
     or not exists (select 1 from public.devices d where d.id = s.device_id and d.is_active) then
    update public.sessions set ended_at = now(), ended_reason = 'phone_replaced'
     where id = s.id;
    return;
  end if;
  update public.sessions set last_seen_at = now() where id = s.id;
  return query
    select p.id, s.device_id, p.cyberx_id, p.alias, p.display_name, s.password_leaked, s.expires_at
      from public.profiles p where p.id = s.user_id;
end;
$$;

-- Sign out of this phone (ACC 1.01c). Signing out twice is fine.
create function public.session_end(session_token_hash bytea)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.sessions%rowtype;
begin
  update public.sessions
     set ended_at = now(), ended_reason = 'signed_out'
   where token_hash = session_token_hash and ended_at is null
  returning * into s;
  if s.id is not null then
    insert into public.audit_log (actor_id, subject_id, action, details, device_id)
    values (s.user_id, s.user_id, 'signin.signed_out', '{}'::jsonb, s.device_id);
  end if;
end;
$$;

-- A new password from a signed-in person whose old one was leaked (and, in
-- part 4, from "Forgot password"). Every other session ends.
create function public.session_change_password(session_token_hash bytea, new_password_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
begin
  if new_password_hash is null or new_password_hash !~ '^\$argon2id\$v=19\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$' then
    raise exception 'The password must arrive as an Argon2id hash.' using errcode = '22023';
  end if;
  select * into s from public.session_get(session_token_hash);
  if s.user_id is null then
    raise exception 'There is no session here.' using errcode = '42501';
  end if;
  update auth.users
     set encrypted_password = new_password_hash, updated_at = now()
   where id = s.user_id;
  update public.profiles set password_unchecked_since = null where id = s.user_id;
  update public.sessions set password_leaked = false where token_hash = session_token_hash;
  update public.sessions
     set ended_at = now(), ended_reason = 'password_changed'
   where user_id = s.user_id and ended_at is null and token_hash <> session_token_hash;
  insert into public.audit_log (actor_id, subject_id, action, details, device_id)
  values (s.user_id, s.user_id, 'password.changed',
          jsonb_build_object('reason', 'leaked_at_sign_in'), s.device_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on function
  public.signin_rules(),
  public.signup_bind_device(bytea, bytea),
  public.signin_device(bytea),
  public.signin_phone(bytea),
  public.signin_new_session(uuid, uuid, bytea, text, boolean),
  public.signin_passkey_begin(bytea, text),
  public.signin_passkey_key(bytea, text),
  public.signin_passkey_finish(bytea, text, bigint, bytea),
  public.signin_passkey_refused(bytea, text),
  public.signin_password_begin(bytea),
  public.signin_password_result(bytea, boolean, bytea, boolean),
  public.session_get(bytea),
  public.session_end(bytea),
  public.session_change_password(bytea, text)
  from public, anon, authenticated;

-- The server calls the steps; the helpers they share stay closed.
grant execute on function
  public.signup_bind_device(bytea, bytea),
  public.signin_device(bytea),
  public.signin_passkey_begin(bytea, text),
  public.signin_passkey_key(bytea, text),
  public.signin_passkey_finish(bytea, text, bigint, bytea),
  public.signin_passkey_refused(bytea, text),
  public.signin_password_begin(bytea),
  public.signin_password_result(bytea, boolean, bytea, boolean),
  public.session_get(bytea),
  public.session_end(bytea),
  public.session_change_password(bytea, text)
  to service_role;
