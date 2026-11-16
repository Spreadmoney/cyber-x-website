-- ===========================================================================
-- M1 Sign-up, part 4: Your Cyber X ID, the alias, and notifications
-- (ACC 2.08–2.09)
--
-- The account already exists (part 3). These are the last three screens:
--   2.08   shows the permanent Cyber X ID;
--   2.08b  the person chooses the alias others type to pay them;
--   2.09   they say whether this phone may show notifications.
--
-- The alias rules themselves are from Phase 1.4 (is_valid_alias, and the
-- unique index on profiles.alias). Nothing here loosens them: every function
-- below runs them again, and two people asking for the same alias at the
-- same moment are settled by the unique index, never by the screen.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- How many times a sign-up has asked "is this alias free?"
-- ---------------------------------------------------------------------------

-- An alias is public by design (it is what people type to pay someone), but
-- a sign-up has no reason to ask about hundreds of them. Past the limit the
-- answer is "busy": the screen stops checking as the person types, and
-- choosing an alias still works, because that is decided on its own.
alter table public.signups
  add column alias_checks integer not null default 0 check (alias_checks >= 0);

-- ---------------------------------------------------------------------------
-- Notifications: what the person said when asked (ACC 2.09)
-- ---------------------------------------------------------------------------

-- One row per person. Sending notifications arrives with M5; this only
-- remembers the answer, so the app never asks twice on the way in and
-- Profile can offer it again.
--   granted      the phone said yes
--   denied       the phone said no (only the phone's own settings can undo it)
--   not_now      the person chose "Not now"
--   unsupported  this browser can't show notifications (for example Safari
--                on an iPhone before Cyber X is added to the Home Screen)
create table public.notification_choices (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  push text not null check (push in ('granted', 'denied', 'not_now', 'unsupported')),
  decided_at timestamptz not null default now()
);

comment on table public.notification_choices is
  'What each person answered when asked about notifications. Read your own row; the server writes it.';

alter table public.notification_choices enable row level security;
revoke all on public.notification_choices from public, anon, authenticated;
grant select on public.notification_choices to authenticated;
create policy "Read your own notification choice"
  on public.notification_choices for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- The account behind a finished sign-up
-- ---------------------------------------------------------------------------

-- Every function below starts here: the sign-up must be finished, not
-- expired, and its account active. Locks the sign-up row, so two taps can't
-- run the same step twice at once.
create function public.signup_owner(hash bytea)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
begin
  select s.user_id into owner
    from public.signups s
    join public.profiles p on p.id = s.user_id
   where s.token_hash = hash
     and s.expires_at > now()
     and s.step = 'done'
     and p.status = 'active'
     for update of s;
  if owner is null then
    raise exception 'There is no finished sign-up here.' using errcode = '42501';
  end if;
  return owner;
end;
$$;

-- ---------------------------------------------------------------------------
-- "Is this alias free?" (ACC 2.08b, as the person types)
-- ---------------------------------------------------------------------------

-- available | taken | invalid | busy
create function public.signup_alias_check(hash bytea, candidate text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid := public.signup_owner(hash);
  clean text := lower(btrim(candidate));
  asked integer;
begin
  update public.signups
     set alias_checks = alias_checks + 1
   where token_hash = hash
  returning alias_checks into asked;
  if asked > 300 then
    return 'busy';
  end if;
  if not public.is_valid_alias(clean) then
    return 'invalid';
  end if;
  if exists (select 1 from public.profiles p where p.alias = clean and p.id <> owner) then
    return 'taken';
  end if;
  return 'available';
end;
$$;

-- Up to three of the offered aliases that are allowed and free, in the order
-- offered (ACC 2.08c "Try one of these").
create function public.signup_alias_free(hash bytea, candidates text[])
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid := public.signup_owner(hash);
  asked integer;
  free text[];
begin
  update public.signups
     set alias_checks = alias_checks + 1
   where token_hash = hash
  returning alias_checks into asked;
  if asked > 300 or candidates is null or cardinality(candidates) > 24 then
    return '{}';
  end if;

  select coalesce(array_agg(c.alias order by c.position), '{}')
    into free
    from (
      select c.alias, min(c.position) as position
        from unnest(candidates) with ordinality as c (alias, position)
       where public.is_valid_alias(c.alias)
         and not exists (select 1 from public.profiles p where p.alias = c.alias)
       group by c.alias
       order by min(c.position)
       limit 3
    ) c;
  return free;
end;
$$;

-- ---------------------------------------------------------------------------
-- Choosing the alias (ACC 2.08b "Continue")
-- ---------------------------------------------------------------------------

-- ok | taken | invalid
-- The first alias only: changing one later belongs to Profile (set_alias).
-- If this sign-up already chose an alias, asking for the same one again is
-- "ok" (a double tap); asking for a different one is refused.
create function public.signup_set_alias(hash bytea, new_alias text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid := public.signup_owner(hash);
  clean text := lower(btrim(new_alias));
  current_alias text;
begin
  if not public.is_valid_alias(clean) then
    return 'invalid';
  end if;

  select p.alias into current_alias from public.profiles p where p.id = owner for update;
  if current_alias is not null then
    if current_alias = clean then
      return 'ok';
    end if;
    raise exception 'This sign-up has already chosen its alias.' using errcode = '42501';
  end if;

  -- The unique index decides. When two people ask for the same alias at the
  -- same moment, the second waits here for the first, then is refused.
  begin
    update public.profiles set alias = clean where id = owner;
  exception
    when unique_violation then
      return 'taken';
  end;
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- Notifications (ACC 2.09)
-- ---------------------------------------------------------------------------

-- Remembers the answer and ends the sign-up's screens. The alias comes
-- first: nobody reaches Home without one.
create function public.signup_set_notifications(hash bytea, choice text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid := public.signup_owner(hash);
begin
  if choice is null or choice not in ('granted', 'denied', 'not_now', 'unsupported') then
    raise exception 'That isn''t an answer about notifications.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles p where p.id = owner and p.alias is not null) then
    raise exception 'Choose an alias first.' using errcode = '42501';
  end if;

  insert into public.notification_choices (user_id, push)
  values (owner, choice)
  on conflict (user_id) do update
    set push = excluded.push, decided_at = now()
    where public.notification_choices.push is distinct from excluded.push;

  insert into public.audit_log (actor_id, subject_id, action, details)
  values (owner, owner, 'notifications.answered', jsonb_build_object('push', choice));
end;
$$;

-- ---------------------------------------------------------------------------
-- signup_account: now also says what was answered about notifications
-- ---------------------------------------------------------------------------

drop function public.signup_account(bytea);
create function public.signup_account(hash bytea)
returns table (
  user_id uuid,
  cyberx_id text,
  alias text,
  display_name text,
  has_passkey boolean,
  notifications text
)
language sql
security definer
stable
set search_path = ''
as $$
  select p.id, p.cyberx_id, p.alias, p.display_name,
         exists (select 1 from public.passkeys k where k.user_id = p.id),
         (select n.push from public.notification_choices n where n.user_id = p.id)
    from public.signups s
    join public.profiles p on p.id = s.user_id
   where s.token_hash = hash
     and s.expires_at > now()
     and s.step = 'done'
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on function
  public.signup_owner(bytea),
  public.signup_alias_check(bytea, text),
  public.signup_alias_free(bytea, text[]),
  public.signup_set_alias(bytea, text),
  public.signup_set_notifications(bytea, text),
  public.signup_account(bytea)
  from public, anon, authenticated;

grant execute on function
  public.signup_alias_check(bytea, text),
  public.signup_alias_free(bytea, text[]),
  public.signup_set_alias(bytea, text),
  public.signup_set_notifications(bytea, text),
  public.signup_account(bytea)
  to service_role;
