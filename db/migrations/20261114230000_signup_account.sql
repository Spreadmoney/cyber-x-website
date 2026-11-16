-- ===========================================================================
-- M1 Sign-up, part 3: email, passkey, password, and creating the account
-- (ACC 2.05–2.07c)
--
-- "Create account" happens in one step here: the login, the profile with its
-- permanent Cyber X ID, the consents, this phone as the one active device and
-- the passkey are all written together, or none of them is.
--
-- The password never reaches the database: the server sends an Argon2id hash.
-- The passkey's private half never leaves the phone: only its public key is
-- kept.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Consents: the lasting record (NDPA)
-- ---------------------------------------------------------------------------

-- What each person agreed to, which version of the documents, and when. Rows
-- are added, never changed, except to mark a consent withdrawn.
create table public.consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('adult', 'terms', 'nin_check', 'selfie', 'news')),
  -- The date on the privacy notice and terms that were shown.
  version text not null check (version ~ '^\d{4}-\d{2}-\d{2}$'),
  given_at timestamptz not null,
  withdrawn_at timestamptz,
  check (withdrawn_at is null or withdrawn_at >= given_at)
);

comment on table public.consents is
  'What each person agreed to and when. Read your own rows; the server writes them.';

create index consents_user_id on public.consents (user_id);
create unique index consents_one_live_per_kind
  on public.consents (user_id, kind)
  where withdrawn_at is null;

alter table public.consents enable row level security;
revoke all on public.consents from public, anon, authenticated;
grant select on public.consents to authenticated;
create policy "Read your own consents"
  on public.consents for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- A sign-up's passkey, waiting for the account
-- ---------------------------------------------------------------------------

alter table public.signups
  -- The one-time challenge the phone must sign, and when it was issued.
  add column passkey_challenge text
    check (passkey_challenge is null or passkey_challenge ~ '^[A-Za-z0-9_-]{22,128}$'),
  add column passkey_challenge_at timestamptz,
  -- The passkey made at ACC 2.06, kept here until the account exists.
  add column passkey_credential_id text
    check (passkey_credential_id is null
           or (passkey_credential_id ~ '^[A-Za-z0-9_-]+$'
               and char_length(passkey_credential_id) between 16 and 1366)),
  add column passkey_public_key bytea
    check (passkey_public_key is null or octet_length(passkey_public_key) between 32 and 2048),
  add column passkey_sign_count bigint not null default 0 check (passkey_sign_count >= 0),
  add column passkey_transports text[] not null default '{}',
  add column passkey_backed_up boolean not null default false,
  add constraint signups_passkey_whole
    check ((passkey_credential_id is null) = (passkey_public_key is null)),
  add constraint signups_done_has_user
    check ((step = 'done') = (user_id is not null));

-- The sign-up at or past a step, with its number still freshly verified.
-- Every function below starts here, so none of them can be called early or
-- after the 30 minutes are up.
create function public.signup_ready(hash bytea, at_least public.signup_step)
returns public.signups
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.signups%rowtype;
begin
  select * into s from public.signups
   where token_hash = hash and expires_at > now()
   for update;
  if not found then
    raise exception 'This sign-up has expired.' using errcode = 'P0002';
  end if;
  if s.step = 'done' then
    raise exception 'This sign-up is finished.' using errcode = '22023';
  end if;
  if s.step < at_least then
    raise exception 'That step comes later.' using errcode = '22023';
  end if;
  if s.phone_verified_at is null or s.phone_verified_at <= now() - interval '30 minutes' then
    raise exception 'The phone number must be verified again.' using errcode = 'P0003';
  end if;
  return s;
end;
$$;

-- ACC 2.05 "Skip for now" (and, later, after an email is connected).
create function public.signup_skip_email(hash bytea)
returns public.signup_step
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.signups%rowtype := public.signup_ready(hash, 'email');
begin
  update public.signups set step = 'passkey' where id = s.id and step = 'email';
  return (select step from public.signups where id = s.id);
end;
$$;

-- ACC 2.06: the server makes a challenge for the phone to sign. It is good
-- for five minutes and for one passkey.
create function public.signup_passkey_begin(hash bytea, challenge text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.signups%rowtype := public.signup_ready(hash, 'passkey');
begin
  update public.signups
     set passkey_challenge = challenge, passkey_challenge_at = now()
   where id = s.id;
end;
$$;

-- The challenge to check the phone's answer against, if it is still good.
create function public.signup_passkey_challenge(hash bytea)
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select s.passkey_challenge
    from public.signups s
   where s.token_hash = hash
     and s.expires_at > now()
     and s.passkey_challenge_at > now() - interval '5 minutes'
$$;

-- The server has checked the phone's answer; keep the passkey's public half.
create function public.signup_passkey_finish(
  hash bytea,
  credential_id text,
  public_key bytea,
  sign_count bigint,
  transports text[],
  backed_up boolean
)
returns public.signup_step
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.signups%rowtype := public.signup_ready(hash, 'passkey');
begin
  if s.passkey_challenge is null
     or s.passkey_challenge_at <= now() - interval '5 minutes' then
    raise exception 'The passkey request has run out. Try again.' using errcode = '22023';
  end if;
  if exists (select 1 from public.passkeys p where p.credential_id = signup_passkey_finish.credential_id) then
    raise exception 'That passkey is already in use.' using errcode = '23505';
  end if;

  update public.signups
     set passkey_credential_id = signup_passkey_finish.credential_id,
         passkey_public_key = signup_passkey_finish.public_key,
         passkey_sign_count = coalesce(signup_passkey_finish.sign_count, 0),
         passkey_transports = coalesce(signup_passkey_finish.transports, '{}'),
         passkey_backed_up = coalesce(signup_passkey_finish.backed_up, false),
         -- A challenge is used once.
         passkey_challenge = null,
         passkey_challenge_at = null,
         step = 'password'
   where id = s.id;
  return 'password';
end;
$$;

-- ACC 2.06 "Not now", or a phone that can't make passkeys.
create function public.signup_skip_passkey(hash bytea)
returns public.signup_step
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.signups%rowtype := public.signup_ready(hash, 'passkey');
begin
  update public.signups
     set step = 'password', passkey_challenge = null, passkey_challenge_at = null
   where id = s.id and step = 'passkey';
  return (select step from public.signups where id = s.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Create account (ACC 2.07)
-- ---------------------------------------------------------------------------

-- Everything at once, or nothing. Returns the new Cyber X ID.
create function public.signup_create_account(
  hash bytea,
  password_hash text,
  device_label text,
  device_platform text
)
returns table (user_id uuid, cyberx_id text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.signups%rowtype := public.signup_ready(hash, 'password');
  -- The account takes the sign-up's own id. The passkey made at ACC 2.06 was
  -- told that id as its owner, so the phone can name the account at sign-in.
  new_id uuid := s.id;
  new_device uuid;
  -- Supabase keeps phone numbers without the plus sign.
  plain_phone text := ltrim(s.phone, '+');
begin
  -- Only an Argon2id hash: never a password, never a weaker hash.
  if password_hash is null or password_hash !~ '^\$argon2id\$v=19\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$' then
    raise exception 'The password must arrive as an Argon2id hash.' using errcode = '22023';
  end if;
  if public.phone_has_account(s.phone) then
    raise exception 'That number already has an account.' using errcode = '23505';
  end if;

  -- The login. Written the way Supabase Auth writes its own rows, so its
  -- tools and its sign-in keep working with accounts made here.
  insert into auth.users (
    instance_id, id, aud, role, phone, phone_confirmed_at, encrypted_password,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
    plain_phone, s.phone_verified_at, password_hash,
    jsonb_build_object('provider', 'phone', 'providers', jsonb_build_array('phone')),
    '{}'::jsonb, now(), now(),
    '', '', '', ''
  );
  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  values (
    new_id::text, new_id,
    jsonb_build_object('sub', new_id::text, 'phone', plain_phone, 'phone_verified', true),
    'phone', now(), now()
  );

  -- The profile and its Cyber X ID were made by the trigger on auth.users.
  update public.profiles set display_name = s.first_name where id = new_id;

  insert into public.consents (user_id, kind, version, given_at)
  select new_id, c.kind, s.consent_version, c.given_at
    from (values
      ('adult', s.adult_at), ('terms', s.terms_at),
      ('nin_check', s.nin_check_at), ('selfie', s.selfie_at),
      ('news', case when s.news_opt_in then s.terms_at end)
    ) as c (kind, given_at)
   where c.given_at is not null;

  insert into public.devices (user_id, label, platform)
  values (new_id, device_label, device_platform)
  returning id into new_device;

  if s.passkey_credential_id is not null then
    insert into public.passkeys (
      user_id, device_id, credential_id, public_key, sign_count, transports, backed_up
    ) values (
      new_id, new_device, s.passkey_credential_id, s.passkey_public_key,
      s.passkey_sign_count, s.passkey_transports, s.passkey_backed_up
    );
  end if;

  insert into public.audit_log (actor_id, subject_id, action, details, device_id)
  values (
    new_id, new_id, 'signup.completed',
    jsonb_build_object(
      'passkey', s.passkey_credential_id is not null,
      'sim_flagged', s.sim_flagged_at is not null,
      'consent_version', s.consent_version
    ),
    new_device
  );

  -- The sign-up is finished. It keeps nothing it no longer needs.
  update public.signups
     set step = 'done',
         user_id = new_id,
         passkey_credential_id = null,
         passkey_public_key = null,
         passkey_challenge = null,
         passkey_challenge_at = null
   where id = s.id;

  return query select new_id, p.cyberx_id from public.profiles p where p.id = new_id;
end;
$$;

-- What the screens after "Create account" may know (ACC 2.08 onwards).
create function public.signup_account(hash bytea)
returns table (user_id uuid, cyberx_id text, alias text, display_name text, has_passkey boolean)
language sql
security definer
stable
set search_path = ''
as $$
  select p.id, p.cyberx_id, p.alias, p.display_name,
         exists (select 1 from public.passkeys k where k.user_id = p.id)
    from public.signups s
    join public.profiles p on p.id = s.user_id
   where s.token_hash = hash
     and s.expires_at > now()
     and s.step = 'done'
$$;

-- signup_get: a finished sign-up is always "done", whatever the clock says,
-- and now says whether a passkey is waiting.
drop function public.signup_get(bytea);
create function public.signup_get(hash bytea)
returns table (
  id uuid,
  step public.signup_step,
  first_name text,
  news_opt_in boolean,
  phone text,
  phone_verified_at timestamptz,
  expires_at timestamptz,
  has_passkey boolean
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
         case
           when s.step = 'done' or s.phone_verified_at > now() - interval '30 minutes'
             then s.phone_verified_at
         end,
         s.expires_at,
         s.passkey_credential_id is not null
    from public.signups s
   where s.token_hash = hash
     and s.expires_at > now()
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on function
  public.signup_ready(bytea, public.signup_step),
  public.signup_skip_email(bytea),
  public.signup_passkey_begin(bytea, text),
  public.signup_passkey_challenge(bytea),
  public.signup_passkey_finish(bytea, text, bytea, bigint, text[], boolean),
  public.signup_skip_passkey(bytea),
  public.signup_create_account(bytea, text, text, text),
  public.signup_account(bytea),
  public.signup_get(bytea)
  from public, anon, authenticated;

grant execute on function
  public.signup_skip_email(bytea),
  public.signup_passkey_begin(bytea, text),
  public.signup_passkey_challenge(bytea),
  public.signup_passkey_finish(bytea, text, bytea, bigint, text[], boolean),
  public.signup_skip_passkey(bytea),
  public.signup_create_account(bytea, text, text, text),
  public.signup_account(bytea),
  public.signup_get(bytea)
  to service_role;
