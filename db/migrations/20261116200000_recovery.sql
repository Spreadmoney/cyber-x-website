-- ===========================================================================
-- M2 Sign-in, part 4: forgot password (ACC 7) and forgot PIN (ACC 8)
--
-- On the account's own active phone (it holds the phone's secret):
--   1. a code sent to the account's number;
--   2. a selfie matched to the NIN photo: SIMULATED until the NIN check
--      arrives with Tier 1 in M3 (Ayora, 16 Nov), and recorded as such;
--   3. the new password, or the new Payment PIN, which must differ from
--      the old one.
-- Then every session on every phone ends, the sign-in lock is cleared (for
-- a password) or the PIN unlocked (for a PIN), and a notice goes to the
-- number (SMS is simulated for now). A phone Cyber X doesn't know uses
-- "new phone" (ACC 6) instead.
-- ===========================================================================

alter table public.sessions drop constraint sessions_ended_reason_check;
alter table public.sessions add constraint sessions_ended_reason_check check (ended_reason in (
  'signed_out', 'expired', 'idle', 'password_changed', 'account_unavailable', 'phone_replaced',
  'locked', 'signed_in_again', 'pin_locked', 'frozen',
  'pin_reset'
));

create type public.recovery_kind as enum ('password', 'pin');
create type public.recovery_step as enum ('code', 'selfie', 'new', 'done');

create table public.recoveries (
  id uuid primary key default gen_random_uuid(),
  -- This browser's secret (cx_recover); its hash here.
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid not null references public.devices (id) on delete cascade,
  kind public.recovery_kind not null,
  step public.recovery_step not null default 'code',
  code_hash bytea check (code_hash is null or octet_length(code_hash) = 32),
  code_sent_at timestamptz,
  code_expires_at timestamptz,
  attempts smallint not null default 0 check (attempts between 0 and 5),
  -- 'simulated' until the real match against the NIN photo (M3).
  selfie text check (selfie in ('simulated')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes',
  done_at timestamptz
);

-- Every code sent, for the limits.
create table public.recovery_codes (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  sent_at timestamptz not null default now()
);
create index recovery_codes_user_sent on public.recovery_codes (user_id, sent_at desc);

alter table public.recoveries enable row level security;
alter table public.recovery_codes enable row level security;
revoke all on public.recoveries, public.recovery_codes from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Starting
-- ---------------------------------------------------------------------------

-- Starts (or restarts) this browser's recovery, on this phone's account.
-- Returns the number the code goes to.
create function public.recover_begin(token bytea, device_token_hash bytea, what public.recovery_kind)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  phone uuid;
  owner uuid;
  number text;
begin
  if token is null or octet_length(token) <> 32 then
    raise exception 'A request''s secret must arrive as a 32-byte hash.' using errcode = '22023';
  end if;
  -- Only this account's active phone, and only an account in use.
  select s.device_id, s.user_id into phone, owner from public.signin_phone(device_token_hash) s;
  if what = 'pin' and not exists (select 1 from public.payment_pins p where p.user_id = owner) then
    raise exception 'This account has no Payment PIN yet.' using errcode = '42501';
  end if;
  insert into public.recoveries (token_hash, user_id, device_id, kind)
  values (token, owner, phone, what)
  on conflict (token_hash) do update
    set user_id = excluded.user_id, device_id = excluded.device_id, kind = excluded.kind,
        step = 'code', code_hash = null, code_sent_at = null, code_expires_at = null,
        attempts = 0, selfie = null, created_at = now(),
        expires_at = now() + interval '30 minutes', done_at = null;
  select '+' || u.phone into number from auth.users u where u.id = owner;
  insert into public.audit_log (actor_id, subject_id, action, details, device_id)
  values (owner, owner, 'recovery.started', jsonb_build_object('kind', what), phone);
  return number;
end;
$$;

-- The running recovery behind a browser's secret, locked for this step.
create function public.recover_request(token bytea)
returns public.recoveries
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.recoveries%rowtype;
begin
  select * into r from public.recoveries x
   where x.token_hash = token and x.expires_at > now() and x.done_at is null
     for update;
  if r.id is null then
    raise exception 'There is no recovery here.' using errcode = '42501';
  end if;
  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. The code (ACC 7.01, 8.01): the same rules as the sign-up code
-- ---------------------------------------------------------------------------

create function public.recover_send_code(token bytea, new_code_hash bytea)
returns table (status text, expires_at timestamptz, resend_at timestamptz, retry_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.recoveries%rowtype := public.recover_request(token);
  rules record;
  recent integer;
  oldest timestamptz;
begin
  select * into rules from public.freeze_rules();
  if r.step <> 'code' then
    raise exception 'The code step is done.' using errcode = '42501';
  end if;
  if new_code_hash is null or octet_length(new_code_hash) <> 32 then
    raise exception 'A code must arrive as a 32-byte hash.' using errcode = '22023';
  end if;
  if r.code_sent_at > now() - rules.resend_after then
    return query select 'too_soon'::text, r.code_expires_at, r.code_sent_at + rules.resend_after,
                        null::timestamptz;
    return;
  end if;
  select count(*), min(c.sent_at) into recent, oldest from public.recovery_codes c
   where c.user_id = r.user_id and c.sent_at > now() - rules.code_window;
  if recent >= rules.codes_per_window then
    return query select 'limit'::text, null::timestamptz, null::timestamptz, oldest + rules.code_window;
    return;
  end if;
  insert into public.recovery_codes (user_id) values (r.user_id);
  update public.recoveries
     set code_hash = new_code_hash, code_sent_at = now(),
         code_expires_at = now() + rules.code_life, attempts = 0
   where id = r.id;
  return query select 'sent'::text, now() + rules.code_life, now() + rules.resend_after,
                      null::timestamptz;
end;
$$;

-- ok | wrong | burned | expired
create function public.recover_verify(token bytea, try_hash bytea)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.recoveries%rowtype := public.recover_request(token);
  tries integer := (select f.tries from public.freeze_rules() f);
begin
  if r.step <> 'code' then
    raise exception 'The code step is done.' using errcode = '42501';
  end if;
  if r.code_hash is null or r.code_expires_at <= now() then
    return 'expired';
  end if;
  if r.attempts >= tries then
    return 'burned';
  end if;
  if try_hash is distinct from r.code_hash then
    update public.recoveries set attempts = attempts + 1 where id = r.id;
    return case when r.attempts + 1 >= tries then 'burned' else 'wrong' end;
  end if;
  update public.recoveries set step = 'selfie', code_hash = null where id = r.id;
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. The selfie (ACC 7.02, 8.02): simulated until M3
-- ---------------------------------------------------------------------------

create function public.recover_selfie_simulated(token bytea)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.recoveries%rowtype := public.recover_request(token);
begin
  if r.step <> 'selfie' then
    raise exception 'Not at the selfie step.' using errcode = '42501';
  end if;
  update public.recoveries set step = 'new', selfie = 'simulated' where id = r.id;
  insert into public.audit_log (actor_id, subject_id, action, details, device_id)
  values (r.user_id, r.user_id, 'recovery.selfie', jsonb_build_object('match', 'simulated'), r.device_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Where the recovery is (for the screens)
-- ---------------------------------------------------------------------------

create function public.recover_state(token bytea)
returns table (
  kind public.recovery_kind,
  step public.recovery_step,
  phone text,
  display_name text,
  code_expires_at timestamptz,
  resend_at timestamptz
)
language sql
security definer
stable
set search_path = ''
as $$
  select r.kind, r.step, '+' || u.phone, p.display_name, r.code_expires_at,
         r.code_sent_at + (select resend_after from public.freeze_rules())
    from public.recoveries r
    join auth.users u on u.id = r.user_id
    join public.profiles p on p.id = r.user_id
   where r.token_hash = token
     and (r.done_at is not null or r.expires_at > now())
$$;

-- ---------------------------------------------------------------------------
-- 3. The new password or PIN (ACC 7.03, 8.03–8.04)
-- ---------------------------------------------------------------------------

-- The current hash, for the server to check the new one isn't the same.
create function public.recover_current_secret(token bytea)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.recoveries%rowtype := public.recover_request(token);
  current_hash text;
begin
  if r.step <> 'new' then
    raise exception 'Not at the new-secret step.' using errcode = '42501';
  end if;
  if r.kind = 'password' then
    select u.encrypted_password::text into current_hash from auth.users u where u.id = r.user_id;
  else
    select p.pin_hash into current_hash from public.payment_pins p where p.user_id = r.user_id;
  end if;
  return current_hash;
end;
$$;

create function public.recover_finish(token bytea, new_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.recoveries%rowtype := public.recover_request(token);
begin
  if r.step <> 'new' then
    raise exception 'Not at the new-secret step.' using errcode = '42501';
  end if;
  if new_hash is null or new_hash !~ '^\$argon2id\$v=19\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$' then
    raise exception 'It must arrive as an Argon2id hash.' using errcode = '22023';
  end if;

  if r.kind = 'password' then
    update auth.users set encrypted_password = new_hash, updated_at = now() where id = r.user_id;
    update public.profiles set password_unchecked_since = null where id = r.user_id;
    -- A new password clears the sign-in lock.
    update public.signin_guards set failures = 0, locked_until = null where user_id = r.user_id;
    update public.sessions set ended_at = now(), ended_reason = 'password_changed'
     where user_id = r.user_id and ended_at is null;
  else
    update public.payment_pins
       set pin_hash = new_hash, set_at = now(), failures = 0, locked_at = null
     where user_id = r.user_id;
    update public.sessions set ended_at = now(), ended_reason = 'pin_reset'
     where user_id = r.user_id and ended_at is null;
  end if;

  update public.recoveries set step = 'done', done_at = now() where id = r.id;
  insert into public.audit_log (actor_id, subject_id, action, details, device_id)
  values (r.user_id, r.user_id,
          case r.kind when 'password' then 'password.reset' else 'pin.reset' end,
          jsonb_build_object('selfie', r.selfie, 'notice', 'sms_simulated'), r.device_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on function
  public.recover_begin(bytea, bytea, public.recovery_kind),
  public.recover_request(bytea),
  public.recover_send_code(bytea, bytea),
  public.recover_verify(bytea, bytea),
  public.recover_selfie_simulated(bytea),
  public.recover_state(bytea),
  public.recover_current_secret(bytea),
  public.recover_finish(bytea, text)
  from public, anon, authenticated;

grant execute on function
  public.recover_begin(bytea, bytea, public.recovery_kind),
  public.recover_send_code(bytea, bytea),
  public.recover_verify(bytea, bytea),
  public.recover_selfie_simulated(bytea),
  public.recover_state(bytea),
  public.recover_current_secret(bytea),
  public.recover_finish(bytea, text)
  to service_role;
