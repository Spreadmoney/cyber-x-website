-- ===========================================================================
-- M1 Sign-up, part 2: the phone number and its code (ACC 2.03–2.04f)
--
-- The rules live here, in the database, so no screen and no request can get
-- round them (decided with Ayora, 14 Nov 2026):
--   - a code is six digits and lasts 60 seconds;
--   - five wrong tries burn a code: a new one must be requested;
--   - a new code can't be requested within 30 seconds of the last one;
--   - at most five codes go to one number in any 12 hours, whichever phone
--     or browser asks, and starting over doesn't reset the count;
--   - one account per number: a number that already has an account is
--     refused, here as well as on the screen;
--   - a verified number is held for this sign-up for 30 minutes; after that
--     it must be verified again before the account is created.
--
-- The code itself never reaches the database: the server sends only a hash
-- salted with the secret in the phone's cookie.
-- ===========================================================================

alter table public.signups
  -- How many different numbers this sign-up has tried (at most 10).
  add column phone_changes smallint not null default 0 check (phone_changes between 0 and 10),
  -- Set when the SIM check found something (ACC 2.04f). Verification (M3)
  -- asks for one more check before such an account can move money.
  add column sim_flagged_at timestamptz,
  add constraint signups_phone_format
    check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  add constraint signups_phone_before_code
    check (step in ('consents', 'name', 'phone') or phone is not null),
  add constraint signups_verified_before_email
    check (step in ('consents', 'name', 'phone', 'code') or phone_verified_at is not null);

-- ---------------------------------------------------------------------------
-- Codes sent
-- ---------------------------------------------------------------------------

-- One row per code sent. Rows outlive the sign-up that asked for them (the
-- link is cleared, the row stays), so "start over" can't reset the limit on
-- a number. Rows are swept after 24 hours.
create table public.signup_codes (
  id bigint generated always as identity primary key,
  signup_id uuid references public.signups (id) on delete set null,
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  -- sha256 of "cookie secret:code". Never the code.
  code_hash bytea not null check (octet_length(code_hash) = 32),
  sent_at timestamptz not null default now(),
  expires_at timestamptz not null,
  wrong_tries smallint not null default 0 check (wrong_tries between 0 and 5),
  -- How it ended: the right code, too many wrong tries, or a newer code.
  outcome text check (outcome in ('verified', 'burned', 'replaced')),
  closed_at timestamptz,
  check ((outcome is null) = (closed_at is null))
);

comment on table public.signup_codes is
  'Codes sent during sign-up: hashes only, with the limits per number. Server only; swept after 24 hours.';

create index signup_codes_phone_sent on public.signup_codes (phone, sent_at desc);
create index signup_codes_signup_sent on public.signup_codes (signup_id, sent_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Does this number already have an account? (Supabase stores phones without
-- the plus sign.)
create function public.phone_has_account(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
     where u.phone in (candidate, ltrim(candidate, '+'))
  )
$$;

-- When the limit on a number lifts, or null if another code may be sent now.
create function public.signup_code_retry_at(candidate text)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  -- The fifth most recent code in the last 12 hours, if there is one: when
  -- it turns 12 hours old, there is room for another.
  select c.sent_at + interval '12 hours'
    from public.signup_codes c
   where c.phone = candidate
     and c.sent_at > now() - interval '12 hours'
   order by c.sent_at desc
  offset 4 limit 1
$$;

-- ---------------------------------------------------------------------------
-- Begin (now also sweeps old codes) and get (now knows a stale verification)
-- ---------------------------------------------------------------------------

create or replace function public.signup_begin(hash bytea)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  delete from public.signups where expires_at < now();
  delete from public.signup_codes where sent_at < now() - interval '24 hours';
  insert into public.signups (token_hash) values (hash) returning id into new_id;
  return new_id;
end;
$$;

-- A number verified more than 30 minutes ago must be verified again, so a
-- sign-up past the code step is read as being back at it.
create or replace function public.signup_get(hash bytea)
returns table (
  id uuid,
  step public.signup_step,
  first_name text,
  news_opt_in boolean,
  phone text,
  phone_verified_at timestamptz,
  expires_at timestamptz
)
language sql
security definer
stable
set search_path = ''
as $$
  select s.id,
         case
           when s.step in ('email', 'passkey', 'password')
                and s.phone_verified_at <= now() - interval '30 minutes'
             then 'code'::public.signup_step
           else s.step
         end,
         s.first_name, s.news_opt_in, s.phone,
         case when s.phone_verified_at > now() - interval '30 minutes' then s.phone_verified_at end,
         s.expires_at
    from public.signups s
   where s.token_hash = hash
     and s.expires_at > now()
$$;

-- ---------------------------------------------------------------------------
-- The phone number (ACC 2.03)
-- ---------------------------------------------------------------------------

-- Returns 'ok' (saved, a code is needed), 'verified' (same number, still
-- verified), 'taken' (the number has an account; nothing is saved) or
-- 'too_many_numbers' (this sign-up has tried ten different numbers).
create function public.signup_set_phone(hash bytea, new_phone text, sim_flagged boolean)
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

  if public.phone_has_account(new_phone) then
    return 'taken';
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

-- ---------------------------------------------------------------------------
-- Sending a code (ACC 2.04, 2.04e)
-- ---------------------------------------------------------------------------

-- status: 'sent', 'too_soon' (wait until resend_at), 'too_many' (wait until
-- retry_at), 'verified' (nothing to do) or 'taken'.
create function public.signup_send_code(hash bytea, new_code_hash bytea)
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
  if public.phone_has_account(s.phone) then
    return query select 'taken'::text, null::timestamptz, null::timestamptz,
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
-- Checking a code (ACC 2.04b–2.04d)
-- ---------------------------------------------------------------------------

-- Returns 'verified', 'wrong', 'expired', 'burned' (five wrong tries: ask
-- for a new code), 'none' (no code was sent) or 'taken'.
create function public.signup_verify_code(hash bytea, try_code_hash bytea)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.signups%rowtype;
  c public.signup_codes%rowtype;
begin
  select * into s from public.signups
   where token_hash = hash and expires_at > now()
   for update;
  if not found then
    raise exception 'This sign-up has expired.' using errcode = 'P0002';
  end if;
  if s.phone is null then
    return 'none';
  end if;

  select * into c from public.signup_codes
   where signup_id = s.id and phone = s.phone
   order by sent_at desc, id desc
   limit 1
   for update;
  if not found then
    return 'none';
  end if;
  if c.outcome = 'verified' then
    return 'verified';
  end if;
  if c.outcome = 'burned' then
    return 'burned';
  end if;
  if c.outcome is not null or c.expires_at <= now() then
    return 'expired';
  end if;

  if c.code_hash = try_code_hash then
    if public.phone_has_account(s.phone) then
      return 'taken';
    end if;
    update public.signup_codes set outcome = 'verified', closed_at = now() where id = c.id;
    update public.signups
       set phone_verified_at = now(),
           step = case when step = 'code' then 'email'::public.signup_step else step end
     where id = s.id;
    return 'verified';
  end if;

  if c.wrong_tries + 1 >= 5 then
    update public.signup_codes
       set wrong_tries = 5, outcome = 'burned', closed_at = now()
     where id = c.id;
    return 'burned';
  end if;
  update public.signup_codes set wrong_tries = wrong_tries + 1 where id = c.id;
  return 'wrong';
end;
$$;

-- What the code screen needs to draw itself. Never the code or its hash.
create function public.signup_code_state(hash bytea)
returns table (
  phone text,
  sim_flagged boolean,
  sent_at timestamptz,
  expires_at timestamptz,
  code_open boolean,
  resend_at timestamptz,
  retry_at timestamptz,
  server_now timestamptz
)
language sql
security definer
stable
set search_path = ''
as $$
  select s.phone,
         s.sim_flagged_at is not null,
         c.sent_at,
         c.expires_at,
         coalesce(c.outcome is null and c.expires_at > now(), false),
         (select max(l.sent_at) + interval '30 seconds'
            from public.signup_codes l where l.phone = s.phone),
         public.signup_code_retry_at(s.phone),
         now()
    from public.signups s
    left join lateral (
      select k.* from public.signup_codes k
       where k.signup_id = s.id and k.phone = s.phone
       order by k.sent_at desc, k.id desc
       limit 1
    ) c on true
   where s.token_hash = hash
     and s.expires_at > now()
$$;

-- ---------------------------------------------------------------------------
-- Row-level security and privileges
-- ---------------------------------------------------------------------------

alter table public.signup_codes enable row level security;

revoke all on public.signup_codes from public, anon, authenticated, service_role;

revoke all on function
  public.phone_has_account(text),
  public.signup_code_retry_at(text),
  public.signup_set_phone(bytea, text, boolean),
  public.signup_send_code(bytea, bytea),
  public.signup_verify_code(bytea, bytea),
  public.signup_code_state(bytea)
  from public, anon, authenticated;

grant execute on function
  public.signup_set_phone(bytea, text, boolean),
  public.signup_send_code(bytea, bytea),
  public.signup_verify_code(bytea, bytea),
  public.signup_code_state(bytea)
  to service_role;
