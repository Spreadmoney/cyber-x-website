-- ===========================================================================
-- M2 Sign-in, part 2: the Payment PIN, the app lock and unlocking
-- (ACC 4.04–4.06)
--
--   Lock      After 5 minutes away, a session is locked. Someone with a
--             Payment PIN unlocks with it (or signs in again with Face ID);
--             someone without one signs in again. The session still ends
--             after 30 minutes unused, as before.
--   PIN       Stored only as an Argon2id hash. 5 wrong in a row lock the
--             PIN itself: the session ends, and only "Forgot PIN?" (ACC 8)
--             makes a new one. The PIN is created at the end of Tier 1
--             (M3, Ayora 16 Nov); pin_set is ready for it.
--   Face ID   A phone signed in without a passkey is offered one, once
--             (ACC 4.06), so people who skipped it at sign-up can add it.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- The numbers
-- ---------------------------------------------------------------------------

create function public.unlock_rules()
returns table (lock_after interval, pin_tries integer, warn_from integer)
language sql
immutable
set search_path = ''
as $$
  -- Locked after 5 minutes away; 5 PIN tries; the count shown from 3 left
  -- (as on D2b, decided 5 Oct).
  select interval '5 minutes', 5, 3
$$;

-- ---------------------------------------------------------------------------
-- More ways a session can end
-- ---------------------------------------------------------------------------

alter table public.sessions drop constraint sessions_ended_reason_check;
alter table public.sessions add constraint sessions_ended_reason_check check (ended_reason in (
  'signed_out', 'expired', 'idle', 'password_changed', 'account_unavailable', 'phone_replaced',
  -- Locked with no PIN to unlock it: sign in again.
  'locked',
  -- Signed in again on the same phone: the old session gives way.
  'signed_in_again',
  -- Too many wrong PINs.
  'pin_locked'
));

-- ---------------------------------------------------------------------------
-- The Payment PIN
-- ---------------------------------------------------------------------------

create table public.payment_pins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  pin_hash text not null
    check (pin_hash ~ '^\$argon2id\$v=19\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$'),
  set_at timestamptz not null default now(),
  -- Wrong PINs in a row since the last right one.
  failures smallint not null default 0 check (failures between 0 and 4),
  -- Too many wrong: only "Forgot PIN?" sets a new one.
  locked_at timestamptz
);

comment on table public.payment_pins is
  'Each person''s Payment PIN, as an Argon2id hash, and its wrong tries. Server only.';

alter table public.payment_pins enable row level security;
revoke all on public.payment_pins from public, anon, authenticated;

-- A PIN that can be used: set, and not locked.
create function public.pin_usable(owner uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.payment_pins p where p.user_id = owner and p.locked_at is null
  )
$$;

-- ---------------------------------------------------------------------------
-- Using a session, now with the lock
-- ---------------------------------------------------------------------------

drop function public.session_get(bytea);
create function public.session_get(session_token_hash bytea)
returns table (
  user_id uuid,
  device_id uuid,
  cyberx_id text,
  alias text,
  display_name text,
  password_leaked boolean,
  expires_at timestamptz,
  -- Away for 5 minutes: nothing opens until the PIN (or Face ID) unlocks it.
  locked boolean,
  has_pin boolean,
  has_passkey boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.sessions%rowtype;
  state public.account_status;
  rules record;
  away boolean;
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

  away := s.last_seen_at <= now() - (select lock_after from public.unlock_rules());
  if away and not public.pin_usable(s.user_id) then
    -- Nothing to unlock with: sign in again (Face ID or the password).
    update public.sessions set ended_at = now(), ended_reason = 'locked' where id = s.id;
    return;
  end if;
  -- A locked session isn't kept alive by being looked at: it still ends
  -- 30 minutes after it was last used.
  if not away then
    update public.sessions set last_seen_at = now() where id = s.id;
  end if;
  return query
    select p.id, s.device_id, p.cyberx_id, p.alias, p.display_name, s.password_leaked,
           s.expires_at, away, public.pin_usable(p.id),
           exists (select 1 from public.passkeys k where k.device_id = s.device_id)
      from public.profiles p where p.id = s.user_id;
end;
$$;

-- The old session on this phone gives way to a new sign-in.
create function public.session_superseded(session_token_hash bytea)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.sessions
     set ended_at = now(), ended_reason = 'signed_in_again'
   where token_hash = session_token_hash and ended_at is null
$$;

-- An unlocked session, or an error: for the steps below that need one.
create function public.session_unlocked(session_token_hash bytea)
returns table (user_id uuid, device_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
begin
  select * into s from public.session_get(session_token_hash);
  if s.user_id is null or s.locked then
    raise exception 'There is no unlocked session here.' using errcode = '42501';
  end if;
  return query select s.user_id, s.device_id;
end;
$$;

-- Changing a leaked password needs an unlocked session (it always is: the
-- change follows sign-in at once).
create or replace function public.session_change_password(
  session_token_hash bytea,
  new_password_hash text
)
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
  select * into s from public.session_unlocked(session_token_hash);
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
-- Setting the PIN (end of Tier 1, M3; IDN 1.06)
-- ---------------------------------------------------------------------------

-- The first PIN only. A new one later comes through "Forgot PIN?" (ACC 8)
-- or Profile › Security.
create function public.pin_set(session_token_hash bytea, new_pin_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
begin
  if new_pin_hash is null or new_pin_hash !~ '^\$argon2id\$v=19\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$' then
    raise exception 'The PIN must arrive as an Argon2id hash.' using errcode = '22023';
  end if;
  select * into s from public.session_unlocked(session_token_hash);
  if exists (select 1 from public.payment_pins p where p.user_id = s.user_id) then
    raise exception 'A Payment PIN is already set.' using errcode = '42501';
  end if;
  insert into public.payment_pins (user_id, pin_hash) values (s.user_id, new_pin_hash);
  insert into public.audit_log (actor_id, subject_id, action, details, device_id)
  values (s.user_id, s.user_id, 'pin.set', '{}'::jsonb, s.device_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Unlocking with the PIN (ACC 4.04–4.04c)
-- ---------------------------------------------------------------------------

-- The PIN's hash, for the server to compare: only for a locked session
-- whose PIN can be used.
create function public.unlock_pin_begin(session_token_hash bytea)
returns table (pin_hash text, tries_left integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
begin
  select * into s from public.session_get(session_token_hash);
  if s.user_id is null or not s.locked then
    raise exception 'There is nothing to unlock here.' using errcode = '42501';
  end if;
  return query
    select p.pin_hash, (select pin_tries from public.unlock_rules()) - p.failures
      from public.payment_pins p
     where p.user_id = s.user_id and p.locked_at is null;
end;
$$;

-- What the comparison found:
--   unlocked    the session carries on
--   wrong       tries_left more before the PIN locks
--   pin_locked  the PIN is locked and the session has ended
create function public.unlock_pin_result(session_token_hash bytea, correct boolean)
returns table (outcome text, tries_left integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  pin public.payment_pins%rowtype;
  tries integer := (select pin_tries from public.unlock_rules());
begin
  select * into s from public.session_get(session_token_hash);
  if s.user_id is null or not s.locked then
    raise exception 'There is nothing to unlock here.' using errcode = '42501';
  end if;
  select * into pin from public.payment_pins p
   where p.user_id = s.user_id and p.locked_at is null
     for update;
  if pin.user_id is null then
    raise exception 'There is no Payment PIN to unlock with.' using errcode = '42501';
  end if;

  if correct then
    update public.payment_pins set failures = 0 where user_id = s.user_id;
    update public.sessions set last_seen_at = now() where token_hash = session_token_hash;
    insert into public.audit_log (actor_id, subject_id, action, details, device_id)
    values (s.user_id, s.user_id, 'unlock.succeeded', jsonb_build_object('method', 'pin'), s.device_id);
    return query select 'unlocked'::text, tries;
    return;
  end if;

  if pin.failures + 1 < tries then
    update public.payment_pins set failures = failures + 1 where user_id = s.user_id;
    insert into public.audit_log (actor_id, subject_id, action, details, device_id)
    values (null, s.user_id, 'unlock.pin_wrong',
            jsonb_build_object('tries_left', tries - pin.failures - 1), s.device_id);
    return query select 'wrong'::text, tries - pin.failures - 1;
    return;
  end if;

  -- The last try: the PIN locks, and this session ends.
  update public.payment_pins set failures = 0, locked_at = now() where user_id = s.user_id;
  update public.sessions set ended_at = now(), ended_reason = 'pin_locked'
   where token_hash = session_token_hash;
  insert into public.audit_log (actor_id, subject_id, action, details, device_id)
  values (null, s.user_id, 'pin.locked', '{}'::jsonb, s.device_id);
  return query select 'pin_locked'::text, 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- Adding Face ID on a signed-in phone (ACC 4.06)
-- ---------------------------------------------------------------------------

alter table public.device_keys add column passkey_offer_answered_at timestamptz;

-- Offer it? Only on a phone with no passkey, and only once.
create function public.account_passkey_offer(session_token_hash bytea)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
begin
  select * into s from public.session_unlocked(session_token_hash);
  return not exists (select 1 from public.passkeys k where k.device_id = s.device_id)
     and exists (select 1 from public.device_keys dk
                  where dk.device_id = s.device_id and dk.passkey_offer_answered_at is null);
end;
$$;

-- "Not now": remembered for this phone.
create function public.account_passkey_decline(session_token_hash bytea)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
begin
  select * into s from public.session_unlocked(session_token_hash);
  update public.device_keys set passkey_offer_answered_at = coalesce(passkey_offer_answered_at, now())
   where device_id = s.device_id;
end;
$$;

-- Remembers the challenge; returns who the passkey is for.
create function public.account_passkey_begin(session_token_hash bytea, new_challenge text)
returns table (user_id uuid, display_name text, phone text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
begin
  if new_challenge is null or new_challenge !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'That isn''t a challenge.' using errcode = '22023';
  end if;
  select * into s from public.session_unlocked(session_token_hash);
  if exists (select 1 from public.passkeys k where k.device_id = s.device_id) then
    raise exception 'This phone already has a passkey.' using errcode = '42501';
  end if;
  update public.device_keys set challenge = new_challenge, challenge_at = now()
   where device_id = s.device_id;
  return query
    select p.id, p.display_name, '+' || u.phone
      from public.profiles p join auth.users u on u.id = p.id
     where p.id = s.user_id;
end;
$$;

-- The challenge, if still fresh, used up as it is read.
create function public.account_passkey_challenge(session_token_hash bytea)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  issued text;
  issued_at timestamptz;
begin
  select * into s from public.session_unlocked(session_token_hash);
  select k.challenge, k.challenge_at into issued, issued_at
    from public.device_keys k where k.device_id = s.device_id
     for update;
  update public.device_keys set challenge = null, challenge_at = null where device_id = s.device_id;
  if issued_at is null or issued_at <= now() - (select challenge_life from public.signin_rules()) then
    return null;
  end if;
  return issued;
end;
$$;

-- The phone's genuine new passkey: kept for this phone.
create function public.account_passkey_add(
  session_token_hash bytea,
  new_credential_id text,
  new_public_key bytea,
  new_sign_count bigint,
  new_transports text[],
  new_backed_up boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
begin
  select * into s from public.session_unlocked(session_token_hash);
  if exists (select 1 from public.passkeys k where k.device_id = s.device_id) then
    raise exception 'This phone already has a passkey.' using errcode = '42501';
  end if;
  insert into public.passkeys (
    user_id, device_id, credential_id, public_key, sign_count, transports, backed_up
  ) values (
    s.user_id, s.device_id, new_credential_id, new_public_key, coalesce(new_sign_count, 0),
    coalesce(new_transports, '{}'), coalesce(new_backed_up, false)
  );
  update public.device_keys set passkey_offer_answered_at = coalesce(passkey_offer_answered_at, now())
   where device_id = s.device_id;
  insert into public.audit_log (actor_id, subject_id, action, details, device_id)
  values (s.user_id, s.user_id, 'passkey.added', '{}'::jsonb, s.device_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on function
  public.unlock_rules(),
  public.pin_usable(uuid),
  public.session_get(bytea),
  public.session_superseded(bytea),
  public.session_unlocked(bytea),
  public.pin_set(bytea, text),
  public.unlock_pin_begin(bytea),
  public.unlock_pin_result(bytea, boolean),
  public.account_passkey_offer(bytea),
  public.account_passkey_decline(bytea),
  public.account_passkey_begin(bytea, text),
  public.account_passkey_challenge(bytea),
  public.account_passkey_add(bytea, text, bytea, bigint, text[], boolean)
  from public, anon, authenticated;

grant execute on function
  public.session_get(bytea),
  public.session_superseded(bytea),
  public.pin_set(bytea, text),
  public.unlock_pin_begin(bytea),
  public.unlock_pin_result(bytea, boolean),
  public.account_passkey_offer(bytea),
  public.account_passkey_decline(bytea),
  public.account_passkey_begin(bytea, text),
  public.account_passkey_challenge(bytea),
  public.account_passkey_add(bytea, text, bytea, bigint, text[], boolean)
  to service_role;
