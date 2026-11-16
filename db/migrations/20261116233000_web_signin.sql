-- ===========================================================================
-- Website · W2 · Sign in and freeze on the website (codebase2)
--
-- The website's sign-in, its own short sessions, Your account and Freeze my
-- account, as web functions run by the website's own login (cyberx_website,
-- W0.4). Built with the app's M2 so both sides of sign-in use one set of
-- rules.
--
--   Who        A Cyber X ID, an alias or a phone number. One that matches no
--              account goes through the same steps and never succeeds, so the
--              website can't be used to find out who has an account.
--   Password   Then a texted code. Wrong passwords count towards the app's
--              own sign-in lock (signin_guards), per account. Per visitor (a
--              hash of the browser's network address): 10 wrong answers in an
--              hour pause sign-in from there for 15 minutes.
--   Code only  "Get a code by text": a code to the account's number, with the
--              app's code rules (60 seconds, a new one after 30, 5 in 12
--              hours, 5 tries).
--   Passkey    The passkey made in the app, offered to the website through the
--              app's /.well-known/webauthn file (Related Origin Requests). The
--              website's server checks the signature; these functions hand it
--              the public key and record the result. The counter must move
--              forward, and each challenge is used once.
--   Sessions   The website's own (web.sessions), never the app's: signing out
--              here leaves the app signed in, and the other way round. They
--              end after 15 minutes unused or 2 hours in all, at sign-out, at
--              a freeze, when the account can't be used, and when the password
--              changes.
--   Freeze     The app's own public.account_freeze, with source 'website':
--              every app session ends and no money can leave; money coming in
--              still arrives. Unfreezing stays with the team (M2 part 3).
--
-- The tables live in the web section and are readable by nobody but their
-- owner. The website reaches them only through the functions granted below.
-- Everything is written to the app's audit log, marked "website".
-- ===========================================================================

-- The app's freeze record learns a third way in: from the website.
alter table public.account_freezes drop constraint account_freezes_source_check;
alter table public.account_freezes add constraint account_freezes_source_check
  check (source in ('owner_code', 'owner_phone', 'website'));

-- ---------------------------------------------------------------------------
-- The numbers, in one place
-- ---------------------------------------------------------------------------

create function web.signin_rules()
returns table (
  attempt_life interval,
  visitor_tries integer,
  visitor_window interval,
  visitor_pause interval,
  session_idle interval,
  session_life interval
)
language sql
immutable
set search_path = ''
as $$
  select interval '15 minutes', 10, interval '1 hour', interval '15 minutes',
         interval '15 minutes', interval '2 hours'
$$;

-- ---------------------------------------------------------------------------
-- Tables (owner only)
-- ---------------------------------------------------------------------------

-- Wrong answers from one visitor (a hash of their network address).
create table web.visitors (
  visitor_hash bytea primary key check (octet_length(visitor_hash) = 32),
  failures smallint not null default 0 check (failures >= 0),
  window_started_at timestamptz not null default now(),
  paused_until timestamptz
);

-- One sign-in in progress in one browser (its secret's hash).
create table web.signin_attempts (
  id uuid primary key default gen_random_uuid(),
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  visitor_hash bytea not null check (octet_length(visitor_hash) = 32),
  -- Null when what was typed matches no account (the steps go on regardless).
  user_id uuid references public.profiles (id) on delete cascade,
  method text not null check (method in ('password', 'code', 'passkey')),
  -- What was typed: only a typed phone number may be shown back.
  typed text check (typed is null or typed in ('id', 'alias', 'phone')),
  password_ok_at timestamptz,
  code_hash bytea check (code_hash is null or octet_length(code_hash) = 32),
  code_sent_at timestamptz,
  code_expires_at timestamptz,
  codes_sent smallint not null default 0 check (codes_sent >= 0),
  code_tries smallint not null default 0 check (code_tries >= 0),
  challenge text check (challenge is null or challenge ~ '^[A-Za-z0-9_-]{16,128}$'),
  challenge_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  done_at timestamptz,
  check ((challenge is null) = (challenge_at is null))
);

-- Codes sent to each account from the website, for the 5-in-12-hours limit.
create table web.codes_sent (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  sent_at timestamptz not null default now()
);
create index codes_sent_by_user on web.codes_sent (user_id, sent_at desc);

-- The website's own sessions. The cookie holds the secret; this its hash.
create table web.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  method text not null check (method in ('password', 'code', 'passkey')),
  -- "Chrome on Mac": shown under "Where you're signed in".
  browser text not null check (char_length(btrim(browser)) between 1 and 80),
  -- A fingerprint of the password at sign-in: a new password ends the session.
  password_mark bytea not null check (octet_length(password_mark) = 32),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  ended_reason text check (ended_reason in (
    'signed_out', 'expired', 'idle', 'frozen', 'account_unavailable', 'password_changed'
  )),
  check ((ended_at is null) = (ended_reason is null))
);
create index web_sessions_live_by_user on web.sessions (user_id) where ended_at is null;

comment on table web.visitors is 'Wrong sign-in answers per visitor, for the website. Owner only.';
comment on table web.signin_attempts is 'Website sign-ins in progress. Owner only.';
comment on table web.codes_sent is 'Sign-in codes the website has sent, per account. Owner only.';
comment on table web.sessions is 'The website''s own signed-in sessions. Owner only.';

alter table web.visitors enable row level security;
alter table web.signin_attempts enable row level security;
alter table web.codes_sent enable row level security;
alter table web.sessions enable row level security;
revoke all on web.visitors, web.signin_attempts, web.codes_sent, web.sessions
  from public, anon, authenticated, cyberx_website;

-- ---------------------------------------------------------------------------
-- Helpers (not for the website to call)
-- ---------------------------------------------------------------------------

-- A visitor got something wrong. Returns when sign-in is paused for them.
create function web.visitor_failed(visitor bytea)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  rules record;
  v web.visitors%rowtype;
begin
  select * into rules from web.signin_rules();
  insert into web.visitors (visitor_hash) values (visitor) on conflict do nothing;
  select * into v from web.visitors where visitor_hash = visitor for update;
  if v.window_started_at <= now() - rules.visitor_window then
    v.failures := 0;
    v.window_started_at := now();
  end if;
  v.failures := v.failures + 1;
  if v.failures >= rules.visitor_tries then
    v.paused_until := now() + rules.visitor_pause;
    v.failures := 0;
    v.window_started_at := now();
    insert into public.audit_log (actor_id, subject_id, action, details)
    values (null, null, 'website.visitor_paused', jsonb_build_object('until', v.paused_until));
  end if;
  update web.visitors
     set failures = v.failures, window_started_at = v.window_started_at, paused_until = v.paused_until
   where visitor_hash = visitor;
  return case when v.paused_until > now() then v.paused_until end;
end;
$$;

-- When sign-in is paused for this visitor, if it is.
create function web.visitor_paused(visitor bytea)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select v.paused_until from web.visitors v
   where v.visitor_hash = visitor and v.paused_until > now()
$$;

-- A live attempt, locked for change.
create function web.attempt(token bytea)
returns web.signin_attempts
language sql
security definer
set search_path = ''
as $$
  select a.* from web.signin_attempts a
   where a.token_hash = token and a.done_at is null and a.expires_at > now()
     for update
$$;

-- Why an account can't sign in, or null when it can.
create function web.unavailable(owner uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case p.status when 'active' then null when 'frozen_by_user' then 'frozen'
                       else 'unavailable' end
    from public.profiles p where p.id = owner
$$;

-- A fingerprint of the account's current password.
create function web.password_mark(owner uuid)
returns bytea
language sql
stable
security definer
set search_path = ''
as $$
  select sha256(convert_to(coalesce(u.encrypted_password, ''), 'UTF8'))
    from auth.users u where u.id = owner
$$;

-- A new website session. Clears the wrong-password count, as the app does.
create function web.new_session(owner uuid, token bytea, how text, browser text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  ends timestamptz := now() + (select session_life from web.signin_rules());
begin
  if token is null or octet_length(token) <> 32 then
    raise exception 'A session''s secret must arrive as a 32-byte hash.' using errcode = '22023';
  end if;
  insert into web.sessions (user_id, token_hash, method, browser, password_mark, expires_at)
  values (owner, token, how, left(btrim(coalesce(nullif(btrim(browser), ''), 'A browser')), 80),
          web.password_mark(owner), ends);
  insert into public.signin_guards (user_id) values (owner)
  on conflict on constraint signin_guards_pkey do update set failures = 0;
  insert into public.audit_log (actor_id, subject_id, action, details)
  values (owner, owner, 'signin.succeeded', jsonb_build_object('method', how, 'where', 'website'));
  return ends;
end;
$$;

-- A wrong password, counted on the app's own sign-in lock (the same rules as
-- public.signin_password_result).
create function web.password_wrong(owner uuid)
returns table (outcome text, tries_left integer, locked_until timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.signin_guards%rowtype;
  rules record;
  level smallint;
  until timestamptz;
begin
  select * into rules from public.signin_rules();
  insert into public.signin_guards (user_id) values (owner) on conflict do nothing;
  select * into g from public.signin_guards where user_id = owner for update;
  if g.locked_until > now() then
    return query select 'locked'::text, 0, g.locked_until;
    return;
  end if;
  if g.failures + 1 < rules.tries then
    update public.signin_guards set failures = failures + 1 where user_id = owner;
    insert into public.audit_log (actor_id, subject_id, action, details)
    values (null, owner, 'signin.password_wrong',
            jsonb_build_object('tries_left', rules.tries - g.failures - 1, 'where', 'website'));
    return query select 'wrong'::text, rules.tries - g.failures - 1, null::timestamptz;
    return;
  end if;
  level := case when g.last_locked_at > now() - interval '24 hours'
                then least(g.lock_level + 1, 20) else 1 end;
  until := now() + least(rules.first_lock * power(2, level - 1), rules.longest_lock);
  update public.signin_guards
     set failures = 0, locked_until = until, lock_level = level, last_locked_at = now()
   where user_id = owner;
  insert into public.audit_log (actor_id, subject_id, action, details)
  values (null, owner, 'signin.locked',
          jsonb_build_object('until', until, 'level', level, 'where', 'website'));
  return query select 'locked'::text, 0, until;
end;
$$;

-- ---------------------------------------------------------------------------
-- W2.1 · Sign in with a password or a code
-- ---------------------------------------------------------------------------

-- Starts a sign-in in this browser. `kind` says what `who` is: 'id' (a Cyber
-- X ID), 'alias' (without the @) or 'phone' (+234…, already tidied by the
-- website). `how` is 'password' or 'code'.
--   paused_until    sign-in is paused for this visitor; nothing else happens
--   password_hash   for 'password': the stored hash to compare, or null when
--                   nothing matches (the website compares against a decoy)
--   locked_until    the account's sign-in is locked until then
create function web.signin_start(token bytea, visitor bytea, kind text, who text, how text)
returns table (paused_until timestamptz, password_hash text, locked_until timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  paused timestamptz;
  lock timestamptz;
begin
  if token is null or octet_length(token) <> 32 or visitor is null or octet_length(visitor) <> 32 then
    raise exception 'Secrets must arrive as 32-byte hashes.' using errcode = '22023';
  end if;
  if kind is null or kind not in ('id', 'alias', 'phone') or how not in ('password', 'code') then
    raise exception 'Unknown kind of sign-in.' using errcode = '22023';
  end if;
  -- Old attempts are cleared as new ones come in.
  delete from web.signin_attempts where expires_at < now() - interval '1 day';

  paused := web.visitor_paused(visitor);
  if paused is not null then
    return query select paused, null::text, null::timestamptz;
    return;
  end if;

  select p.id into owner from public.profiles p join auth.users u on u.id = p.id
   where case kind
           when 'id' then p.cyberx_id = upper(btrim(who))
           when 'alias' then p.alias = lower(btrim(who))
           else u.phone = ltrim(btrim(who), '+')
         end;

  insert into web.signin_attempts (token_hash, visitor_hash, user_id, method, typed, expires_at)
  values (token, visitor, owner, how, kind, now() + (select attempt_life from web.signin_rules()))
  on conflict (token_hash) do update
    set visitor_hash = excluded.visitor_hash, user_id = excluded.user_id, method = excluded.method,
        typed = excluded.typed, password_ok_at = null, code_hash = null, code_sent_at = null,
        code_expires_at = null, codes_sent = 0, code_tries = 0, challenge = null,
        challenge_at = null, created_at = now(), expires_at = excluded.expires_at, done_at = null;

  if owner is not null then
    select g.locked_until into lock from public.signin_guards g
     where g.user_id = owner and g.locked_until > now();
  end if;
  if how = 'password' and lock is null and owner is not null then
    return query select null::timestamptz, u.encrypted_password::text, null::timestamptz
                   from auth.users u where u.id = owner;
    return;
  end if;
  return query select null::timestamptz, null::text, lock;
end;
$$;

-- What the website's comparison found.
--   code_needed   the password was right: send a code to `phone`
--   wrong         tries_left more before the lock (null when nothing matched)
--   locked        the account is locked until `until`
--   paused        this visitor is paused until `until`
--   frozen        the password was right, but the account is frozen
--   unavailable   the password was right, but the account can't be used
--   gone          no such sign-in in progress (start again)
create function web.signin_password(token bytea, correct boolean)
returns table (outcome text, tries_left integer, until timestamptz, phone text, shown_phone boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  a web.signin_attempts;
  verdict record;
  paused timestamptz;
  why text;
begin
  a := web.attempt(token);
  if a.id is null or a.method <> 'password' or a.password_ok_at is not null then
    return query select 'gone'::text, null::integer, null::timestamptz, null::text, false;
    return;
  end if;
  paused := web.visitor_paused(a.visitor_hash);
  if paused is not null then
    return query select 'paused'::text, null::integer, paused, null::text, false;
    return;
  end if;

  if a.user_id is null or correct is not true then
    paused := web.visitor_failed(a.visitor_hash);
    if a.user_id is null then
      if paused is not null then
        return query select 'paused'::text, null::integer, paused, null::text, false;
      else
        return query select 'wrong'::text, null::integer, null::timestamptz, null::text, false;
      end if;
      return;
    end if;
    select * into verdict from web.password_wrong(a.user_id);
    if verdict.outcome = 'locked' then
      return query select 'locked'::text, 0, verdict.locked_until, null::text, false;
    elsif paused is not null then
      return query select 'paused'::text, null::integer, paused, null::text, false;
    else
      return query select 'wrong'::text, verdict.tries_left, null::timestamptz, null::text, false;
    end if;
    return;
  end if;

  -- Right password. Locked meanwhile? The answer doesn't count.
  if exists (select 1 from public.signin_guards g where g.user_id = a.user_id and g.locked_until > now()) then
    return query select 'locked'::text, 0,
      (select g.locked_until from public.signin_guards g where g.user_id = a.user_id), null::text, false;
    return;
  end if;
  why := web.unavailable(a.user_id);
  if why is not null then
    update web.signin_attempts set done_at = now() where id = a.id;
    return query select why, null::integer, null::timestamptz, null::text, false;
    return;
  end if;
  update web.signin_attempts set password_ok_at = now() where id = a.id;
  return query select 'code_needed'::text, null::integer, null::timestamptz, '+' || u.phone, true
                 from auth.users u where u.id = a.user_id;
end;
$$;

-- Sends (or resends) the code for this sign-in.
--   sent       a new code: `deliver` says whether to text it to `phone`
--              (false when nothing matched: nothing is sent, nobody can tell)
--   too_soon   a new code only from `resend_at`
--   limit      no more codes until `retry_at`
--   gone       no such sign-in in progress
create function web.signin_send_code(token bytea, new_code_hash bytea)
returns table (
  status text,
  deliver boolean,
  phone text,
  shown_phone boolean,
  expires_at timestamptz,
  resend_at timestamptz,
  retry_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  a web.signin_attempts;
  rules record;
  oldest timestamptz;
  sent integer;
  number text;
begin
  if new_code_hash is null or octet_length(new_code_hash) <> 32 then
    raise exception 'A code must arrive as a 32-byte hash.' using errcode = '22023';
  end if;
  a := web.attempt(token);
  if a.id is null or a.method = 'passkey'
     or (a.method = 'password' and a.password_ok_at is null) then
    return query select 'gone'::text, false, null::text, false, null::timestamptz,
                        null::timestamptz, null::timestamptz;
    return;
  end if;
  select * into rules from public.freeze_rules();

  if a.code_sent_at > now() - rules.resend_after then
    return query select 'too_soon'::text, false, null::text, false, null::timestamptz,
                        a.code_sent_at + rules.resend_after, null::timestamptz;
    return;
  end if;

  if a.user_id is not null then
    select count(*), min(c.sent_at) into sent, oldest from web.codes_sent c
     where c.user_id = a.user_id and c.sent_at > now() - rules.code_window;
  else
    sent := a.codes_sent;
    oldest := a.created_at;
  end if;
  if sent >= rules.codes_per_window then
    return query select 'limit'::text, false, null::text, false, null::timestamptz,
                        null::timestamptz, oldest + rules.code_window;
    return;
  end if;

  update web.signin_attempts
     set code_hash = new_code_hash, code_sent_at = now(), code_expires_at = now() + rules.code_life,
         codes_sent = codes_sent + 1
   where id = a.id;
  if a.user_id is not null then
    insert into web.codes_sent (user_id) values (a.user_id);
    select '+' || u.phone into number from auth.users u where u.id = a.user_id;
    insert into public.audit_log (actor_id, subject_id, action, details)
    values (null, a.user_id, 'signin.code_sent', jsonb_build_object('where', 'website'));
  end if;
  return query select 'sent'::text, a.user_id is not null, number,
                      a.method = 'password' or a.typed = 'phone',
                      now() + rules.code_life, now() + rules.resend_after, null::timestamptz;
end;
$$;

-- Checks a code. On success, starts a website session (the cookie's hash).
--   signed_in    ends_at says when the session ends at the latest
--   wrong        tries_left more (the count shows from 3)
--   expired      the code is over 60 seconds old: send a new one
--   stopped      too many wrong codes: start again
--   paused       this visitor is paused until `until`
--   frozen, unavailable, gone
create function web.signin_verify_code(token bytea, try_hash bytea, session_token bytea, browser text)
returns table (outcome text, tries_left integer, until timestamptz, ends_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  a web.signin_attempts;
  rules record;
  paused timestamptz;
  why text;
begin
  a := web.attempt(token);
  if a.id is null or a.code_hash is null then
    return query select 'gone'::text, null::integer, null::timestamptz, null::timestamptz;
    return;
  end if;
  paused := web.visitor_paused(a.visitor_hash);
  if paused is not null then
    return query select 'paused'::text, null::integer, paused, null::timestamptz;
    return;
  end if;
  select * into rules from public.freeze_rules();
  if a.code_expires_at <= now() then
    return query select 'expired'::text, rules.tries - a.code_tries, null::timestamptz, null::timestamptz;
    return;
  end if;

  if a.user_id is null or try_hash is null or try_hash <> a.code_hash then
    paused := web.visitor_failed(a.visitor_hash);
    if a.code_tries + 1 >= rules.tries then
      update web.signin_attempts set code_tries = code_tries + 1, done_at = now() where id = a.id;
      if a.user_id is not null then
        insert into public.audit_log (actor_id, subject_id, action, details)
        values (null, a.user_id, 'signin.code_stopped', jsonb_build_object('where', 'website'));
      end if;
      return query select 'stopped'::text, 0, null::timestamptz, null::timestamptz;
      return;
    end if;
    update web.signin_attempts set code_tries = code_tries + 1 where id = a.id;
    if paused is not null then
      return query select 'paused'::text, null::integer, paused, null::timestamptz;
    else
      return query select 'wrong'::text, rules.tries - a.code_tries - 1, null::timestamptz, null::timestamptz;
    end if;
    return;
  end if;

  update web.signin_attempts set done_at = now() where id = a.id;
  why := web.unavailable(a.user_id);
  if why is not null then
    return query select why, null::integer, null::timestamptz, null::timestamptz;
    return;
  end if;
  return query select 'signed_in'::text, null::integer, null::timestamptz,
                      web.new_session(a.user_id, session_token, a.method, browser);
end;
$$;

-- ---------------------------------------------------------------------------
-- W2.2 · Sign in with the passkey made in the app
-- ---------------------------------------------------------------------------

-- Starts a passkey sign-in with a fresh challenge (base64url). Any passkey
-- the app made may answer; the person picks it on their device.
create function web.passkey_start(token bytea, visitor bytea, new_challenge text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  paused timestamptz;
begin
  if token is null or octet_length(token) <> 32 or visitor is null or octet_length(visitor) <> 32 then
    raise exception 'Secrets must arrive as 32-byte hashes.' using errcode = '22023';
  end if;
  paused := web.visitor_paused(visitor);
  if paused is not null then
    return paused;
  end if;
  insert into web.signin_attempts (token_hash, visitor_hash, method, challenge, challenge_at, expires_at)
  values (token, visitor, 'passkey', new_challenge, now(),
          now() + (select attempt_life from web.signin_rules()))
  on conflict (token_hash) do update
    set visitor_hash = excluded.visitor_hash, user_id = null, method = 'passkey', typed = null,
        password_ok_at = null, code_hash = null, code_sent_at = null, code_expires_at = null,
        codes_sent = 0, code_tries = 0, challenge = excluded.challenge,
        challenge_at = excluded.challenge_at, created_at = now(),
        expires_at = excluded.expires_at, done_at = null;
  return null;
end;
$$;

-- The passkey that answered: its public key and counter, with the challenge
-- it had to sign. No rows when the challenge is spent or stale, or the
-- passkey isn't one the app made.
create function web.passkey_key(token bytea, used_credential_id text)
returns table (public_key bytea, sign_count bigint, challenge text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  a web.signin_attempts;
begin
  a := web.attempt(token);
  if a.id is null or a.method <> 'passkey' or a.challenge is null
     or a.challenge_at <= now() - (select challenge_life from public.signin_rules()) then
    return;
  end if;
  return query select k.public_key, k.sign_count, a.challenge
                 from public.passkeys k where k.credential_id = used_credential_id;
end;
$$;

-- What the website's check found. The challenge is spent either way.
--   signed_in   a website session (ends_at)
--   refused     the signature, the person check or the counter failed
--   paused, frozen, unavailable, gone
create function web.passkey_result(
  token bytea,
  used_credential_id text,
  verified boolean,
  new_count bigint,
  session_token bytea,
  browser text
)
returns table (outcome text, until timestamptz, ends_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  a web.signin_attempts;
  k public.passkeys%rowtype;
  paused timestamptz;
  why text;
begin
  a := web.attempt(token);
  if a.id is null or a.method <> 'passkey' or a.challenge is null then
    return query select 'gone'::text, null::timestamptz, null::timestamptz;
    return;
  end if;
  update web.signin_attempts set challenge = null, challenge_at = null where id = a.id;
  select * into k from public.passkeys p where p.credential_id = used_credential_id for update;

  -- The counter must move forward (or stay at 0 for passkeys that keep none).
  if k.id is null or verified is not true or new_count is null
     or not (new_count > k.sign_count or (new_count = 0 and k.sign_count = 0)) then
    paused := web.visitor_failed(a.visitor_hash);
    if k.id is not null then
      insert into public.audit_log (actor_id, subject_id, action, details)
      values (null, k.user_id, 'signin.passkey_refused',
              jsonb_build_object('where', 'website',
                                 'reason', case when verified is not true then 'signature' else 'counter' end));
    end if;
    return query select case when paused is not null then 'paused' else 'refused' end, paused,
                        null::timestamptz;
    return;
  end if;

  update web.signin_attempts set done_at = now(), user_id = k.user_id where id = a.id;
  why := web.unavailable(k.user_id);
  if why is not null then
    return query select why, null::timestamptz, null::timestamptz;
    return;
  end if;
  update public.passkeys set sign_count = new_count, last_used_at = now() where id = k.id;
  return query select 'signed_in'::text, null::timestamptz,
                      web.new_session(k.user_id, session_token, 'passkey', browser);
end;
$$;

-- ---------------------------------------------------------------------------
-- W2.3 · The website's own sessions
-- ---------------------------------------------------------------------------

-- The signed-in person behind a website session, and the session kept alive.
-- No rows when it has ended or can't go on (ended here, with the reason).
create function web.session_get(session_token bytea)
returns table (
  display_name text,
  cyberx_id text,
  alias text,
  tier smallint,
  phone text,
  method text,
  browser text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  s web.sessions%rowtype;
  rules record;
  reason text;
begin
  select * into rules from web.signin_rules();
  select * into s from web.sessions x
   where x.token_hash = session_token and x.ended_at is null
     for update;
  if s.id is null then
    return;
  end if;
  reason := case
    when s.expires_at <= now() then 'expired'
    when s.last_seen_at <= now() - rules.session_idle then 'idle'
    when web.unavailable(s.user_id) = 'frozen' then 'frozen'
    when web.unavailable(s.user_id) is not null then 'account_unavailable'
    when web.password_mark(s.user_id) <> s.password_mark then 'password_changed'
  end;
  if reason is not null then
    update web.sessions set ended_at = now(), ended_reason = reason where id = s.id;
    return;
  end if;
  update web.sessions set last_seen_at = now() where id = s.id;
  return query
    select p.display_name, p.cyberx_id, p.alias, p.tier, '+' || u.phone, s.method, s.browser,
           least(s.expires_at, now() + rules.session_idle)
      from public.profiles p join auth.users u on u.id = p.id
     where p.id = s.user_id;
end;
$$;

-- Signs this browser out of the website. The app stays signed in.
create function web.session_end(session_token bytea)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
begin
  update web.sessions set ended_at = now(), ended_reason = 'signed_out'
   where token_hash = session_token and ended_at is null
   returning user_id into owner;
  if owner is null then
    return false;
  end if;
  insert into public.audit_log (actor_id, subject_id, action, details)
  values (owner, owner, 'signin.signed_out', jsonb_build_object('where', 'website'));
  return true;
end;
$$;

-- The person behind a live website session (for the functions below).
create function web.session_owner(session_token bytea)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select s.user_id from web.session_get(session_token) g
    join web.sessions s on s.token_hash = session_token and s.ended_at is null
$$;

-- ---------------------------------------------------------------------------
-- W2.4 · Your account (never a balance)
-- ---------------------------------------------------------------------------

-- "Where you're signed in": the account's phones (with whether the app is
-- signed in there) and this account's live website sessions.
create function web.account_places(session_token bytea)
returns table (
  place_id uuid,
  kind text,
  label text,
  platform text,
  active boolean,
  signed_in boolean,
  this_browser boolean,
  last_seen_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid := web.session_owner(session_token);
begin
  if owner is null then
    return;
  end if;
  return query
    select d.id, 'phone'::text, d.label, d.platform, d.is_active,
           exists (select 1 from public.sessions s where s.device_id = d.id and s.ended_at is null),
           false, d.last_seen_at
      from public.devices d
     where d.user_id = owner and d.is_active
    union all
    select w.id, 'browser'::text, w.browser, 'web'::text, true, true,
           w.token_hash = session_token, w.last_seen_at
      from web.sessions w
     where w.user_id = owner and w.ended_at is null
       and w.expires_at > now()
       and w.last_seen_at > now() - (select session_idle from web.signin_rules())
     order by 2 desc, 8 desc nulls last;
end;
$$;

-- "Recent sign-ins": the app's and the website's, newest first.
create function web.account_signins(session_token bytea, how_many integer)
returns table (signed_in_at timestamptz, place text, label text, method text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid := web.session_owner(session_token);
begin
  if owner is null then
    return;
  end if;
  return query
    select x.at, x.place, x.label, x.method from (
      select s.created_at as at, 'app'::text as place, coalesce(d.label, 'A phone') as label, s.method
        from public.sessions s left join public.devices d on d.id = s.device_id
       where s.user_id = owner
      union all
      select w.created_at, 'website'::text, w.browser, w.method
        from web.sessions w where w.user_id = owner
    ) x
    order by x.at desc
    limit least(greatest(coalesce(how_many, 5), 1), 20);
end;
$$;

-- Signs the app out on one of this account's phones (Your account, "Sign
-- out"). Returns how many app sessions ended (0: nothing to do).
create function web.account_sign_out_phone(session_token bytea, phone_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid := web.session_owner(session_token);
  ended integer;
begin
  if owner is null then
    return 0;
  end if;
  update public.sessions s set ended_at = now(), ended_reason = 'signed_out'
   where s.device_id = phone_id and s.user_id = owner and s.ended_at is null;
  get diagnostics ended = row_count;
  if ended > 0 then
    insert into public.audit_log (actor_id, subject_id, action, details, device_id)
    values (owner, owner, 'signin.signed_out', jsonb_build_object('where', 'website', 'by', 'website'),
            phone_id);
  end if;
  return ended;
end;
$$;

-- ---------------------------------------------------------------------------
-- W2.5 · Freeze my account
-- ---------------------------------------------------------------------------

-- Freezes the account behind this website session through the app's own
-- freeze, then ends every website session. Returns when it was frozen.
-- Already frozen: nothing changes, and the first freeze's time comes back.
create function web.freeze(session_token bytea)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid := web.session_owner(session_token);
  at timestamptz;
begin
  if owner is null then
    return null;
  end if;
  perform public.account_freeze(owner, 'website');
  update web.sessions set ended_at = now(), ended_reason = 'frozen'
   where user_id = owner and ended_at is null;
  select f.frozen_at into at from public.account_freezes f
   where f.user_id = owner and f.unfrozen_at is null;
  return at;
end;
$$;

-- ---------------------------------------------------------------------------
-- Closed to everyone, then opened to the website's login alone
-- ---------------------------------------------------------------------------

revoke all on function
  web.signin_rules(),
  web.visitor_failed(bytea),
  web.visitor_paused(bytea),
  web.attempt(bytea),
  web.unavailable(uuid),
  web.password_mark(uuid),
  web.new_session(uuid, bytea, text, text),
  web.password_wrong(uuid),
  web.signin_start(bytea, bytea, text, text, text),
  web.signin_password(bytea, boolean),
  web.signin_send_code(bytea, bytea),
  web.signin_verify_code(bytea, bytea, bytea, text),
  web.passkey_start(bytea, bytea, text),
  web.passkey_key(bytea, text),
  web.passkey_result(bytea, text, boolean, bigint, bytea, text),
  web.session_get(bytea),
  web.session_end(bytea),
  web.session_owner(bytea),
  web.account_places(bytea),
  web.account_signins(bytea, integer),
  web.account_sign_out_phone(bytea, uuid),
  web.freeze(bytea)
from public, anon, authenticated;

grant execute on function
  web.signin_start(bytea, bytea, text, text, text),
  web.signin_password(bytea, boolean),
  web.signin_send_code(bytea, bytea),
  web.signin_verify_code(bytea, bytea, bytea, text),
  web.passkey_start(bytea, bytea, text),
  web.passkey_key(bytea, text),
  web.passkey_result(bytea, text, boolean, bigint, bytea, text),
  web.session_get(bytea),
  web.session_end(bytea),
  web.account_places(bytea),
  web.account_signins(bytea, integer),
  web.account_sign_out_phone(bytea, uuid),
  web.freeze(bytea)
to cyberx_website;
