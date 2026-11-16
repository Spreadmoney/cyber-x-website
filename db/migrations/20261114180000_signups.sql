-- ===========================================================================
-- M1 Sign-up, part 1: a sign-up in progress (ACC 2.01–2.02, 2.10)
--
-- Nobody has an account yet while they sign up, so this is the one table the
-- app keeps for people who are not signed in. Each sign-up is found by a
-- secret the phone holds in a cookie; the database keeps only its hash, so a
-- copy of the table is worth nothing. A sign-up lasts 24 hours, then it is
-- gone. The server is the only thing that may touch it (service_role): the
-- browser never reads or writes this table.
--
-- Consent (NDPA): each required consent is a switch the person turns on, and
-- the time they did so is kept. Nothing is pre-agreed for them.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- First names: a name is never wrong, but it must be a name
-- ---------------------------------------------------------------------------

-- Letters as written in Nigeria's languages (Latin with Yorùbá, Igbo and
-- Hausa letters and tone marks), spaces, hyphens and apostrophes; 1 to 40
-- characters; starts with a letter, ends with a letter or a tone mark. Other
-- country packs widen the letter ranges when they arrive (rule 7). The same
-- rule lives in src/lib/signup/rules.ts; the two are tested side by side.
create function public.is_valid_first_name(candidate text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select candidate is not null
    and candidate = btrim(candidate)
    and char_length(candidate) between 1 and 40
    and candidate ~ '^[A-Za-z\u00C0-\u024F\u0250-\u02AF\u1E00-\u1EFF][A-Za-z\u00C0-\u024F\u0250-\u02AF\u0300-\u036F\u1E00-\u1EFF ''’-]*$'
    and candidate ~ '[A-Za-z\u00C0-\u024F\u0250-\u02AF\u0300-\u036F\u1E00-\u1EFF]$'
    and candidate !~ '  '
$$;

-- ---------------------------------------------------------------------------
-- The table
-- ---------------------------------------------------------------------------

create type public.signup_step as enum (
  'consents', 'name', 'phone', 'code', 'email', 'passkey', 'password', 'done'
);

create table public.signups (
  id uuid primary key default gen_random_uuid(),
  -- sha256 of the secret in the phone's cookie. Never the secret itself.
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  step public.signup_step not null default 'consents',

  -- Consents, each with the moment it was given (ACC 2.01).
  consent_version text check (consent_version ~ '^\d{4}-\d{2}-\d{2}$'),
  adult_at timestamptz,
  terms_at timestamptz,
  nin_check_at timestamptz,
  selfie_at timestamptz,
  news_opt_in boolean not null default false,

  first_name text check (first_name is null or public.is_valid_first_name(first_name)),

  -- Filled in by later parts of M1.
  phone text,
  phone_verified_at timestamptz,
  user_id uuid references auth.users (id) on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',

  -- A step can only be reached once the ones before it are done.
  constraint signups_consents_before_name check (
    step = 'consents'
    or (adult_at is not null and terms_at is not null
        and nin_check_at is not null and selfie_at is not null
        and consent_version is not null)
  ),
  constraint signups_name_before_phone check (
    step in ('consents', 'name') or first_name is not null
  )
);

comment on table public.signups is
  'A sign-up in progress, found by the hash of a cookie secret. Server only; expires after 24 hours.';

create trigger signups_touch_updated_at
  before update on public.signups
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- What the server may do, and nothing else
-- ---------------------------------------------------------------------------

-- Start a sign-up. Also sweeps away sign-ups that have expired, so the table
-- never holds anything older than a day.
create function public.signup_begin(hash bytea)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  delete from public.signups where expires_at < now();
  insert into public.signups (token_hash) values (hash) returning id into new_id;
  return new_id;
end;
$$;

-- Read a sign-up. Returns nothing for an unknown or expired secret.
create function public.signup_get(hash bytea)
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
  select s.id, s.step, s.first_name, s.news_opt_in, s.phone, s.phone_verified_at, s.expires_at
    from public.signups s
   where s.token_hash = hash
     and s.expires_at > now()
$$;

-- Record the consents (ACC 2.01). All four required ones must be true; the
-- database refuses anything else, however the request was made.
create function public.signup_record_consents(
  hash bytea,
  version text,
  adult boolean,
  terms boolean,
  nin_check boolean,
  selfie boolean,
  news boolean
)
returns public.signup_step
language plpgsql
security definer
set search_path = ''
as $$
declare
  current public.signup_step;
begin
  if not (coalesce(adult, false) and coalesce(terms, false)
          and coalesce(nin_check, false) and coalesce(selfie, false)) then
    raise exception 'All four required consents must be given.' using errcode = '22023';
  end if;

  select s.step into current from public.signups s
   where s.token_hash = hash and s.expires_at > now()
   for update;
  if current is null then
    raise exception 'This sign-up has expired.' using errcode = 'P0002';
  end if;
  if current <> 'consents' then
    raise exception 'Consents were already recorded.' using errcode = '22023';
  end if;

  update public.signups
     set consent_version = version,
         adult_at = now(), terms_at = now(), nin_check_at = now(), selfie_at = now(),
         news_opt_in = coalesce(news, false),
         step = 'name'
   where token_hash = hash;
  return 'name';
end;
$$;

-- Save the first name (ACC 2.02). Allowed at the name step and later, so a
-- person can go back and change it before the account exists.
create function public.signup_set_name(hash bytea, name text)
returns public.signup_step
language plpgsql
security definer
set search_path = ''
as $$
declare
  current public.signup_step;
  clean text := regexp_replace(btrim(coalesce(name, '')), '\s+', ' ', 'g');
begin
  if not public.is_valid_first_name(clean) then
    raise exception 'That doesn''t look like a first name.' using errcode = '22023';
  end if;

  select s.step into current from public.signups s
   where s.token_hash = hash and s.expires_at > now()
   for update;
  if current is null then
    raise exception 'This sign-up has expired.' using errcode = 'P0002';
  end if;
  if current = 'consents' then
    raise exception 'Consents come first.' using errcode = '22023';
  end if;
  if current = 'done' then
    raise exception 'This sign-up is finished.' using errcode = '22023';
  end if;

  update public.signups
     set first_name = clean,
         step = case when current = 'name' then 'phone'::public.signup_step else current end
   where token_hash = hash;
  return (select s.step from public.signups s where s.token_hash = hash);
end;
$$;

-- Start over (ACC 2.10): forget everything typed so far.
create function public.signup_abandon(hash bytea)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.signups where token_hash = hash;
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row-level security and privileges
-- ---------------------------------------------------------------------------

alter table public.signups enable row level security;

-- Nobody reads or writes this table directly, not even the server: the server
-- uses the functions above, which do exactly one thing each.
revoke all on public.signups from public, anon, authenticated, service_role;

revoke all on function
  public.is_valid_first_name(text),
  public.signup_begin(bytea),
  public.signup_get(bytea),
  public.signup_record_consents(bytea, text, boolean, boolean, boolean, boolean, boolean),
  public.signup_set_name(bytea, text),
  public.signup_abandon(bytea)
  from public, anon, authenticated;

grant execute on function
  public.signup_begin(bytea),
  public.signup_get(bytea),
  public.signup_record_consents(bytea, text, boolean, boolean, boolean, boolean, boolean),
  public.signup_set_name(bytea, text),
  public.signup_abandon(bytea)
  to service_role;
