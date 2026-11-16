-- ===========================================================================
-- M1 Sign-up: two decisions by Ayora (15 Nov 2026)
--
-- 1. "This number already has an account" is said only after the code sent
--    to that number has been entered. Before, the phone step said it at
--    once, so anyone could type numbers to learn who uses Cyber X. Now a
--    code goes to every number as usual, and only whoever holds the phone
--    can learn the answer (signup_verify_code, unchanged, says 'taken' for
--    the right code and leaves the number unverified).
--
-- 2. When the check against leaked passwords can't be reached (twice), the
--    account is still created, but its password is marked "not yet checked".
--    Sign-in (M2) checks it then, and a leaked password must be changed
--    before anything else.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. No "taken" before the code
-- ---------------------------------------------------------------------------

-- Returns 'ok', 'verified' or 'too_many_numbers'. Never 'taken' any more.
create or replace function public.signup_set_phone(hash bytea, new_phone text, sim_flagged boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.signups%rowtype;
  fresh boolean;
begin
  if new_phone is null or new_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'That isn''t a phone number.' using errcode = '22023';
  end if;

  select * into s from public.signups
   where token_hash = hash and expires_at > now()
   for update;
  if not found then
    raise exception 'This sign-up has expired.' using errcode = 'P0002';
  end if;
  if s.step in ('consents', 'name') then
    raise exception 'The name comes first.' using errcode = '22023';
  end if;
  if s.step = 'done' then
    raise exception 'This sign-up is finished.' using errcode = '22023';
  end if;

  fresh := s.phone_verified_at is not null
           and s.phone_verified_at > now() - interval '30 minutes';
  if s.phone = new_phone and fresh then
    return 'verified';
  end if;

  if s.phone is distinct from new_phone then
    if s.phone_changes >= 10 then
      return 'too_many_numbers';
    end if;
    -- Codes sent to the old number are no use any more.
    update public.signup_codes
       set outcome = 'replaced', closed_at = now()
     where signup_id = s.id and outcome is null;
  end if;

  update public.signups
     set phone = new_phone,
         phone_verified_at = null,
         phone_changes = phone_changes + (s.phone is distinct from new_phone)::int,
         sim_flagged_at = case when coalesce(sim_flagged, false) then now() end,
         step = 'code'
   where id = s.id;
  return 'ok';
end;
$$;

-- status: 'sent', 'too_soon' (wait until resend_at), 'too_many' (wait until
-- retry_at) or 'verified' (nothing to do). Never 'taken' any more: a code
-- goes to a number that has an account too, so the screen gives nothing away.
create or replace function public.signup_send_code(hash bytea, new_code_hash bytea)
returns table (
  status text,
  sent_at timestamptz,
  expires_at timestamptz,
  resend_at timestamptz,
  retry_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.signups%rowtype;
  last_sent timestamptz;
  wait_until timestamptz;
  now_at timestamptz := now();
begin
  select * into s from public.signups g
   where g.token_hash = hash and g.expires_at > now()
   for update;
  if not found then
    raise exception 'This sign-up has expired.' using errcode = 'P0002';
  end if;
  if s.phone is null or s.step in ('consents', 'name', 'phone', 'done') then
    raise exception 'The phone number comes first.' using errcode = '22023';
  end if;

  if s.phone_verified_at > now() - interval '30 minutes' then
    return query select 'verified'::text, null::timestamptz, null::timestamptz,
                        null::timestamptz, null::timestamptz;
    return;
  end if;
  -- One number, one queue: lock it so two requests can't both slip through.
  perform pg_advisory_xact_lock(hashtextextended(s.phone, 0));

  select max(c.sent_at) into last_sent from public.signup_codes c where c.phone = s.phone;
  if last_sent > now_at - interval '30 seconds' then
    return query select 'too_soon'::text, last_sent, null::timestamptz,
                        last_sent + interval '30 seconds', null::timestamptz;
    return;
  end if;

  wait_until := public.signup_code_retry_at(s.phone);
  if wait_until is not null then
    return query select 'too_many'::text, null::timestamptz, null::timestamptz,
                        null::timestamptz, wait_until;
    return;
  end if;

  update public.signup_codes c
     set outcome = 'replaced', closed_at = now_at
   where c.signup_id = s.id and c.outcome is null;

  insert into public.signup_codes (signup_id, phone, code_hash, sent_at, expires_at)
  values (s.id, s.phone, new_code_hash, now_at, now_at + interval '60 seconds');

  -- A stale verification is cleared: the sign-up is back at the code step.
  update public.signups g
     set step = 'code', phone_verified_at = null
   where g.id = s.id and g.step <> 'code';

  return query select 'sent'::text, now_at, now_at + interval '60 seconds',
                      now_at + interval '30 seconds', null::timestamptz;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. A password not yet checked against leaks
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column password_unchecked_since timestamptz;

comment on column public.profiles.password_unchecked_since is
  'Set when the leaked-password check could not be reached at sign-up. Sign-in checks again and clears it.';

-- Called with signup_create_account, in the same transaction.
create function public.signup_password_unchecked(hash bytea)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid := public.signup_owner(hash);
begin
  update public.profiles
     set password_unchecked_since = coalesce(password_unchecked_since, now())
   where id = owner;
  insert into public.audit_log (actor_id, subject_id, action, details)
  values (owner, owner, 'password.unchecked', jsonb_build_object('reason', 'leak_check_unreachable'));
end;
$$;

revoke all on function public.signup_password_unchecked(bytea) from public, anon, authenticated;
grant execute on function public.signup_password_unchecked(bytea) to service_role;
