-- Phase 1.4 · Identity foundation
--
-- The first tables: each person's profile (Cyber X ID, alias, verification
-- level, account status), their one active phone, their passkeys, and an
-- audit log that cannot be edited.
--
-- Security model, in one line: people can read only their own rows, and they
-- never write to these tables directly. Every change goes through the app's
-- server (after it has checked the rules) or through a database function that
-- checks the rules itself. Row-level security is on for every table, so even
-- a bug in the app cannot show one person's data to another.
--
-- Money tables (balances, payments) come in Phase 3.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Account status
-- ---------------------------------------------------------------------------

-- Matches the app-wide states (APP 2): a person can freeze their own account;
-- Cyber X can lock or restrict it; a court can freeze it; it goes dormant
-- after long disuse; and it can be closed.
create type public.account_status as enum (
  'active',
  'frozen_by_user',
  'locked',
  'restricted',
  'frozen_by_order',
  'dormant',
  'closed'
);

-- ---------------------------------------------------------------------------
-- Cyber X ID
-- ---------------------------------------------------------------------------

-- A Cyber X ID looks like CX-7K2M-9QF4-T3XD: twelve random characters from
-- Crockford's alphabet (no I, L, O or U, so nothing is misread), which is 60
-- bits of randomness. It never contains a country code and never changes.
create function public.generate_cyberx_id()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  random_bytes bytea := extensions.gen_random_bytes(12);
  result text := 'CX';
begin
  for position in 0..11 loop
    if position % 4 = 0 then
      result := result || '-';
    end if;
    -- 256 is a multiple of 32, so every character is equally likely.
    result := result || substr(alphabet, (get_byte(random_bytes, position) % 32) + 1, 1);
  end loop;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Alias rules
-- ---------------------------------------------------------------------------

-- An alias is how people pay each other (rule 9: never by phone or account
-- number). Rules:
--   * 3 to 20 characters: lowercase letters, digits, dots and underscores;
--   * starts and ends with a letter or digit, no two dots or underscores in a row;
--   * contains at least one letter, so it can never be a phone or account number;
--   * is not a reserved word, and does not contain "cyberx" anywhere (so nobody
--     can pose as Cyber X: no support.cyberx, no cyber.x.help).
create function public.is_valid_alias(candidate text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select candidate is not null
    and candidate ~ '^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$'
    and candidate !~ '[._]{2}'
    and candidate ~ '[a-z]'
    and candidate !~ 'cyber[._]?x'
    and candidate <> all (array[
      'admin', 'administrator', 'bank', 'cbn', 'compliance', 'cyber', 'fraud',
      'help', 'helpdesk', 'info', 'moderator', 'official', 'payments', 'root',
      'security', 'staff', 'support', 'system', 'team', 'verified', 'x'
    ])
$$;

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------------------

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  cyberx_id text not null unique
    check (cyberx_id ~ '^CX(-[0-9A-HJKMNP-TV-Z]{4}){3}$'),
  alias text unique
    check (alias is null or public.is_valid_alias(alias)),
  display_name text
    check (display_name is null or char_length(btrim(display_name)) between 1 and 120),
  -- Cyber X launches in Nigeria; the country pack decides what each code means.
  country_code text not null default 'NG'
    check (country_code ~ '^[A-Z]{2}$'),
  -- 0 means not verified yet; 1 to 3 are the verification levels.
  tier smallint not null default 0
    check (tier between 0 and 3),
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per person. Read your own row only; changes go through the server or set_alias().';

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- A Cyber X ID is for good: nobody can change it, not even the server.
create function public.protect_profile_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'A profile''s owner cannot change.' using errcode = '42501';
  end if;
  if new.cyberx_id is distinct from old.cyberx_id then
    raise exception 'A Cyber X ID cannot change.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_identity
  before update on public.profiles
  for each row execute function public.protect_profile_identity();

-- ---------------------------------------------------------------------------
-- Devices: one active phone at a time (CBN instant-payment rules)
-- ---------------------------------------------------------------------------

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 80),
  platform text not null check (platform in ('ios', 'android', 'web')),
  is_active boolean not null default true,
  -- The new-phone sending cap counts from here.
  activated_at timestamptz not null default now(),
  last_seen_at timestamptz,
  deactivated_at timestamptz,
  check (is_active = (deactivated_at is null))
);

create unique index devices_one_active_per_user
  on public.devices (user_id)
  where is_active;

create index devices_user_id on public.devices (user_id);

-- ---------------------------------------------------------------------------
-- Passkeys (Face ID and fingerprint sign-in)
-- ---------------------------------------------------------------------------

-- Only the public half of each passkey is stored. The private half never
-- leaves the person's phone.
create table public.passkeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid references public.devices (id) on delete set null,
  credential_id text not null unique
    check (credential_id ~ '^[A-Za-z0-9_-]+$' and char_length(credential_id) between 16 and 1366),
  public_key bytea not null check (octet_length(public_key) between 32 and 2048),
  sign_count bigint not null default 0 check (sign_count >= 0),
  transports text[] not null default '{}',
  backed_up boolean not null default false,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index passkeys_user_id on public.passkeys (user_id);

-- ---------------------------------------------------------------------------
-- Audit log: append-only
-- ---------------------------------------------------------------------------

-- Every important action is written here and can never be edited or removed.
-- Kept for five years after someone leaves (CBN AML rules), so it does not
-- disappear when a profile is deleted: subject_id is deliberately not a
-- foreign key.
create table public.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  -- Who did it: a person's id, or null when the system did it.
  actor_id uuid,
  -- Whose account it concerns.
  subject_id uuid,
  -- area.verb, for example account.created or alias.changed
  action text not null check (action ~ '^[a-z]+(_[a-z]+)*\.[a-z]+(_[a-z]+)*$'),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  ip inet,
  device_id uuid
);

create index audit_log_subject on public.audit_log (subject_id, occurred_at desc);

create function public.audit_log_is_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'The audit log cannot be changed or deleted.' using errcode = '42501';
end;
$$;

create trigger audit_log_no_update_or_delete
  before update or delete on public.audit_log
  for each row execute function public.audit_log_is_append_only();

create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function public.audit_log_is_append_only();

-- ---------------------------------------------------------------------------
-- Automatic audit entries for profile changes
-- ---------------------------------------------------------------------------

create function public.audit_profile_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (actor_id, subject_id, action, details)
    values (auth.uid(), new.id, 'account.created', jsonb_build_object('cyberx_id', new.cyberx_id));
    return new;
  end if;

  if new.alias is distinct from old.alias then
    insert into public.audit_log (actor_id, subject_id, action, details)
    values (auth.uid(), new.id, 'alias.changed', jsonb_build_object('from', old.alias, 'to', new.alias));
  end if;
  if new.tier is distinct from old.tier then
    insert into public.audit_log (actor_id, subject_id, action, details)
    values (auth.uid(), new.id, 'tier.changed', jsonb_build_object('from', old.tier, 'to', new.tier));
  end if;
  if new.status is distinct from old.status then
    insert into public.audit_log (actor_id, subject_id, action, details)
    values (auth.uid(), new.id, 'status.changed', jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end;
$$;

create trigger profiles_audit
  after insert or update on public.profiles
  for each row execute function public.audit_profile_change();

-- ---------------------------------------------------------------------------
-- A profile for every new sign-up
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 60 random bits make a clash very unlikely; retry a few times if one happens.
  for attempt in 1..5 loop
    begin
      insert into public.profiles (id, cyberx_id) values (new.id, public.generate_cyberx_id());
      return new;
    exception when unique_violation then
      if attempt = 5 then
        raise;
      end if;
    end;
  end loop;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Choosing or changing an alias
-- ---------------------------------------------------------------------------

-- The one change a person makes directly. The database checks every rule
-- itself, so the app cannot skip them.
create function public.set_alias(new_alias text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  clean text := lower(btrim(new_alias));
begin
  if me is null then
    raise exception 'You need to be signed in.' using errcode = '42501';
  end if;
  if not public.is_valid_alias(clean) then
    raise exception 'That alias isn''t allowed.' using errcode = '22023';
  end if;

  update public.profiles
     set alias = clean
   where id = me
     and status = 'active';

  if not found then
    raise exception 'Your account can''t change its alias right now.' using errcode = '42501';
  end if;
  return clean;
exception
  when unique_violation then
    raise exception 'That alias is taken.' using errcode = '23505';
end;
$$;

-- ---------------------------------------------------------------------------
-- Row-level security and privileges
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.passkeys enable row level security;
alter table public.audit_log enable row level security;

-- Start from nothing, then grant only what is needed.
revoke all on public.profiles, public.devices, public.passkeys, public.audit_log
  from public, anon, authenticated;

-- People can read their own rows, and only their own rows.
grant select on public.profiles, public.devices, public.passkeys to authenticated;

create policy "Read your own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Read your own devices"
  on public.devices for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Read your own passkeys"
  on public.passkeys for select to authenticated
  using (user_id = (select auth.uid()));

-- Nobody reads the audit log through the app. The server writes it; staff
-- read it through the internal console.
revoke all on public.audit_log from service_role;
grant select, insert on public.audit_log to service_role;

-- Functions: closed by default, opened one by one.
revoke all on function
  public.generate_cyberx_id(),
  public.is_valid_alias(text),
  public.touch_updated_at(),
  public.protect_profile_identity(),
  public.audit_log_is_append_only(),
  public.audit_profile_change(),
  public.handle_new_user(),
  public.set_alias(text)
  from public, anon, authenticated;

grant execute on function public.is_valid_alias(text) to authenticated;
grant execute on function public.set_alias(text) to authenticated;
