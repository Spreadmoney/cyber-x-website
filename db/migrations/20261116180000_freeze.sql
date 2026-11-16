-- ===========================================================================
-- M2 Sign-in, part 3: freezing an account without signing in, and the
-- team unfreezing it (ACC 10.03–10.06)
--
--   Freeze     Anyone with the phone number can freeze the account: the
--              number, then a code sent to it. Freezing only restricts, so
--              that is all it needs. Money stops leaving; money sent to the
--              account still arrives; every session ends. A number with no
--              account goes through the same steps and is never told so.
--   Unfreeze   Only the team, after confirming it is the owner (a live video
--              call). Staff are Cyber X accounts marked by hand in
--              staff_members; nobody can unfreeze their own account. Every
--              look-up and every unfreeze is in the audit log.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- A session can end because the account was frozen
-- ---------------------------------------------------------------------------

alter table public.sessions drop constraint sessions_ended_reason_check;
alter table public.sessions add constraint sessions_ended_reason_check check (ended_reason in (
  'signed_out', 'expired', 'idle', 'password_changed', 'account_unavailable', 'phone_replaced',
  'locked', 'signed_in_again', 'pin_locked',
  'frozen'
));

-- ---------------------------------------------------------------------------
-- Freezes
-- ---------------------------------------------------------------------------

create table public.account_freezes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  frozen_at timestamptz not null default now(),
  -- How it was frozen: by the owner with a code sent to the number (ACC 10.03).
  source text not null check (source in ('owner_code')),
  unfrozen_at timestamptz,
  -- The staff member who unfroze it, and what they checked.
  unfrozen_by uuid references public.profiles (id) on delete set null,
  unfreeze_note text check (unfreeze_note is null or char_length(btrim(unfreeze_note)) between 10 and 500),
  -- "Your account is unfrozen" (ACC 10.06) has been shown.
  unfrozen_notice_seen_at timestamptz,
  check ((unfrozen_at is null) = (unfreeze_note is null))
);

create index account_freezes_user on public.account_freezes (user_id, frozen_at desc);
-- At most one freeze open at a time.
create unique index account_freezes_one_open on public.account_freezes (user_id) where unfrozen_at is null;

comment on table public.account_freezes is
  'Every freeze and unfreeze, kept as a record. Server only.';

alter table public.account_freezes enable row level security;
revoke all on public.account_freezes from public, anon, authenticated;

-- Freezes an account, if it is in use. Already frozen: nothing changes.
create function public.account_freeze(owner uuid, how text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  state public.account_status;
begin
  select p.status into state from public.profiles p where p.id = owner for update;
  if state is distinct from 'active' then
    return;
  end if;
  update public.profiles set status = 'frozen_by_user' where id = owner;
  insert into public.account_freezes (user_id, source) values (owner, how);
  update public.sessions set ended_at = now(), ended_reason = 'frozen'
   where user_id = owner and ended_at is null;
  insert into public.audit_log (actor_id, subject_id, action, details)
  values (owner, owner, 'account.frozen', jsonb_build_object('source', how));
end;
$$;

-- ---------------------------------------------------------------------------
-- Freezing without signing in (ACC 10.03–10.05)
-- ---------------------------------------------------------------------------

-- One request per browser (a secret in the cx_freeze cookie; its hash here).
create table public.freeze_requests (
  id uuid primary key default gen_random_uuid(),
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  -- The account with that number, if there is one. Never shown to the screen.
  user_id uuid references public.profiles (id) on delete cascade,
  code_hash bytea check (code_hash is null or octet_length(code_hash) = 32),
  code_sent_at timestamptz,
  code_expires_at timestamptz,
  attempts smallint not null default 0 check (attempts between 0 and 5),
  created_at timestamptz not null default now(),
  -- A request lasts 30 minutes.
  expires_at timestamptz not null default now() + interval '30 minutes',
  done_at timestamptz
);

-- Every code sent, for the limits (a number can't be flooded with SMS).
create table public.freeze_codes (
  id bigint generated always as identity primary key,
  phone text not null,
  sent_at timestamptz not null default now()
);
create index freeze_codes_phone_sent on public.freeze_codes (phone, sent_at desc);

alter table public.freeze_requests enable row level security;
alter table public.freeze_codes enable row level security;
revoke all on public.freeze_requests, public.freeze_codes from public, anon, authenticated;

create function public.freeze_rules()
returns table (code_life interval, resend_after interval, codes_per_window integer, code_window interval, tries integer)
language sql
immutable
set search_path = ''
as $$
  -- The same as the sign-up code: 60 seconds, a new one after 30, at most 5
  -- in 12 hours to one number, 5 tries.
  select interval '60 seconds', interval '30 seconds', 5, interval '12 hours', 5
$$;

-- ACC 10.03: the number. Starts (or restarts) this browser's request.
create function public.freeze_begin(token bytea, number text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
begin
  if token is null or octet_length(token) <> 32 then
    raise exception 'A request''s secret must arrive as a 32-byte hash.' using errcode = '22023';
  end if;
  if number is null or number !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'That isn''t a phone number.' using errcode = '22023';
  end if;
  select u.id into owner from auth.users u join public.profiles p on p.id = u.id
   where u.phone = ltrim(number, '+');
  insert into public.freeze_requests (token_hash, phone, user_id)
  values (token, number, owner)
  on conflict (token_hash) do update
    set phone = excluded.phone, user_id = excluded.user_id, code_hash = null,
        code_sent_at = null, code_expires_at = null, attempts = 0,
        expires_at = now() + interval '30 minutes', done_at = null;
end;
$$;

-- The request behind a browser's secret, if it is still running.
create function public.freeze_request(token bytea)
returns public.freeze_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.freeze_requests%rowtype;
begin
  select * into r from public.freeze_requests f
   where f.token_hash = token and f.expires_at > now() and f.done_at is null
     for update;
  if r.id is null then
    raise exception 'There is no freeze request here.' using errcode = '42501';
  end if;
  return r;
end;
$$;

-- ACC 10.03 "Send code" and 10.04 "Resend".
--   sent      deliver says whether a real account will get it: the server
--             sends the SMS (or, in test mode, shows it) only then. The
--             screen behaves the same either way.
--   too_soon  wait until resend_at
--   limit     no more to this number until retry_at
create function public.freeze_send_code(token bytea, new_code_hash bytea)
returns table (status text, deliver boolean, expires_at timestamptz, resend_at timestamptz, retry_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.freeze_requests%rowtype := public.freeze_request(token);
  rules record;
  recent integer;
  oldest timestamptz;
begin
  select * into rules from public.freeze_rules();
  if new_code_hash is null or octet_length(new_code_hash) <> 32 then
    raise exception 'A code must arrive as a 32-byte hash.' using errcode = '22023';
  end if;
  if r.code_sent_at > now() - rules.resend_after then
    return query select 'too_soon'::text, false, r.code_expires_at,
                        r.code_sent_at + rules.resend_after, null::timestamptz;
    return;
  end if;
  select count(*), min(c.sent_at) into recent, oldest from public.freeze_codes c
   where c.phone = r.phone and c.sent_at > now() - rules.code_window;
  if recent >= rules.codes_per_window then
    return query select 'limit'::text, false, null::timestamptz, null::timestamptz,
                        oldest + rules.code_window;
    return;
  end if;
  insert into public.freeze_codes (phone) values (r.phone);
  update public.freeze_requests
     set code_hash = new_code_hash, code_sent_at = now(),
         code_expires_at = now() + rules.code_life, attempts = 0
   where id = r.id;
  return query select 'sent'::text, r.user_id is not null, now() + rules.code_life,
                      now() + rules.resend_after, null::timestamptz;
end;
$$;

-- ACC 10.04 "Freeze account".
--   frozen   the account is frozen (or already was)
--   wrong    try again
--   burned   5 wrong tries: this code is finished, ask for a new one
--   expired  ask for a new one
create function public.freeze_verify(token bytea, try_hash bytea)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.freeze_requests%rowtype := public.freeze_request(token);
  tries integer := (select f.tries from public.freeze_rules() f);
begin
  if r.code_hash is null or r.code_expires_at <= now() then
    return 'expired';
  end if;
  if r.attempts >= tries then
    return 'burned';
  end if;
  -- A number with no account never matches: nobody was sent its code.
  if r.user_id is null or try_hash is distinct from r.code_hash then
    update public.freeze_requests set attempts = attempts + 1 where id = r.id;
    if r.attempts + 1 >= tries then
      return 'burned';
    end if;
    return 'wrong';
  end if;
  perform public.account_freeze(r.user_id, 'owner_code');
  update public.freeze_requests set done_at = now(), code_hash = null where id = r.id;
  return 'frozen';
end;
$$;

-- What the code screen shows: the number, and the code's times.
create function public.freeze_state(token bytea)
returns table (phone text, code_expires_at timestamptz, resend_at timestamptz, frozen boolean)
language sql
security definer
stable
set search_path = ''
as $$
  select f.phone, f.code_expires_at,
         f.code_sent_at + (select resend_after from public.freeze_rules()),
         f.done_at is not null
    from public.freeze_requests f
   where f.token_hash = token
     and (f.done_at is not null or f.expires_at > now())
$$;

-- ---------------------------------------------------------------------------
-- What sign-in knows: frozen, and "your account is unfrozen" (ACC 10.06)
-- ---------------------------------------------------------------------------

drop function public.signin_device(bytea);
create function public.signin_device(device_token_hash bytea)
returns table (
  user_id uuid,
  display_name text,
  device_active boolean,
  has_passkey boolean,
  account_status public.account_status,
  locked_until timestamptz,
  first_sign_in boolean,
  -- Unfrozen by the team since this person last looked: say so once.
  unfrozen_notice boolean
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
         not exists (select 1 from public.sessions s where s.user_id = p.id),
         p.status = 'active' and exists (
           select 1 from public.account_freezes f
            where f.user_id = p.id and f.unfrozen_at is not null
              and f.unfrozen_notice_seen_at is null)
    from public.device_keys dk
    join public.devices d on d.id = dk.device_id
    join public.profiles p on p.id = d.user_id
   where dk.token_hash = device_token_hash
$$;

-- "Sign in" on ACC 10.06: the notice has been seen.
create function public.signin_unfrozen_seen(device_token_hash bytea)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.account_freezes f
     set unfrozen_notice_seen_at = now()
    from public.device_keys dk
    join public.devices d on d.id = dk.device_id
   where dk.token_hash = device_token_hash
     and f.user_id = d.user_id
     and f.unfrozen_at is not null
     and f.unfrozen_notice_seen_at is null
$$;

-- ---------------------------------------------------------------------------
-- The team (the start of the internal console)
-- ---------------------------------------------------------------------------

-- Staff are added by hand, in Supabase's SQL editor, never by the app:
--   insert into public.staff_members (user_id, note)
--   select id, 'Founder' from public.profiles where cyberx_id = 'CX-....-....-....';
create table public.staff_members (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role text not null default 'support' check (role in ('support')),
  note text check (note is null or char_length(note) <= 200),
  added_at timestamptz not null default now()
);

comment on table public.staff_members is
  'Cyber X accounts that may use the team pages. Added by hand only.';

alter table public.staff_members enable row level security;
revoke all on public.staff_members from public, anon, authenticated;

-- The signed-in staff member, or an error.
create function public.staff_session(session_token_hash bytea)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
begin
  select * into s from public.session_unlocked(session_token_hash);
  if not exists (select 1 from public.staff_members m where m.user_id = s.user_id) then
    raise exception 'This page is for the Cyber X team.' using errcode = '42501';
  end if;
  return s.user_id;
end;
$$;

create function public.staff_check(session_token_hash bytea)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.staff_session(session_token_hash);
  return true;
exception
  when insufficient_privilege then
    return false;
end;
$$;

-- Find one account by its phone number (+234…) or Cyber X ID. Only what the
-- unfreeze step needs; the number is masked. Every look-up is recorded.
create function public.staff_find_account(session_token_hash bytea, query text)
returns table (
  user_id uuid,
  cyberx_id text,
  display_name text,
  phone_masked text,
  account_status public.account_status,
  frozen_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  staff uuid := public.staff_session(session_token_hash);
  clean text := upper(btrim(coalesce(query, '')));
  kind text;
  found uuid;
begin
  if clean ~ '^\+[1-9][0-9]{7,14}$' then
    kind := 'phone';
    select u.id into found from auth.users u where u.phone = ltrim(clean, '+');
  elsif clean ~ '^CX(-[0-9A-HJKMNP-TV-Z]{4}){3}$' then
    kind := 'cyberx_id';
    select p.id into found from public.profiles p where p.cyberx_id = clean;
  else
    raise exception 'Search by a phone number (+234…) or a Cyber X ID.' using errcode = '22023';
  end if;

  insert into public.audit_log (actor_id, subject_id, action, details)
  values (staff, found, 'staff.lookup', jsonb_build_object('by', kind, 'found', found is not null));

  return query
    select p.id, p.cyberx_id, p.display_name,
           '+' || left(u.phone, 6) || ' •••• ' || right(u.phone, 3),
           p.status,
           (select f.frozen_at from public.account_freezes f
             where f.user_id = p.id and f.unfrozen_at is null),
           p.created_at
      from public.profiles p join auth.users u on u.id = p.id
     where p.id = found;
end;
$$;

-- Unfreeze, after confirming it's the owner on a live video call.
create function public.staff_unfreeze(
  session_token_hash bytea,
  target uuid,
  confirmed_on_video boolean,
  note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  staff uuid := public.staff_session(session_token_hash);
  state public.account_status;
begin
  if confirmed_on_video is not true then
    raise exception 'Confirm it''s the owner on a video call first.' using errcode = '22023';
  end if;
  if note is null or char_length(btrim(note)) not between 10 and 500 then
    raise exception 'Say what you checked, in 10 to 500 characters.' using errcode = '22023';
  end if;
  if target = staff then
    raise exception 'Nobody can unfreeze their own account.' using errcode = '42501';
  end if;
  select p.status into state from public.profiles p where p.id = target for update;
  if state is distinct from 'frozen_by_user' then
    raise exception 'This account isn''t frozen.' using errcode = '22023';
  end if;
  update public.profiles set status = 'active' where id = target;
  update public.account_freezes
     set unfrozen_at = now(), unfrozen_by = staff, unfreeze_note = btrim(note)
   where user_id = target and unfrozen_at is null;
  insert into public.audit_log (actor_id, subject_id, action, details)
  values (staff, target, 'account.unfrozen',
          jsonb_build_object('confirmed_on_video', true, 'note', btrim(note)));
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on function
  public.account_freeze(uuid, text),
  public.freeze_rules(),
  public.freeze_begin(bytea, text),
  public.freeze_request(bytea),
  public.freeze_send_code(bytea, bytea),
  public.freeze_verify(bytea, bytea),
  public.freeze_state(bytea),
  public.signin_device(bytea),
  public.signin_unfrozen_seen(bytea),
  public.staff_session(bytea),
  public.staff_check(bytea),
  public.staff_find_account(bytea, text),
  public.staff_unfreeze(bytea, uuid, boolean, text)
  from public, anon, authenticated;

grant execute on function
  public.freeze_begin(bytea, text),
  public.freeze_send_code(bytea, bytea),
  public.freeze_verify(bytea, bytea),
  public.freeze_state(bytea),
  public.signin_device(bytea),
  public.signin_unfrozen_seen(bytea),
  public.staff_check(bytea),
  public.staff_find_account(bytea, text),
  public.staff_unfreeze(bytea, uuid, boolean, text)
  to service_role;
