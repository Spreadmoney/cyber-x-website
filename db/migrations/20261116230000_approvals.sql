-- M2 part 6: approving a risky action (ACC 5.01–5.02b).
--
-- One shared step, used later by withdrawals (M10), large payments and
-- changes to security settings. The screen that wants approval creates a
-- request; the person approves it on this phone with Face ID (the phone's
-- passkey) or, as a backup, a text code; the screen that asked then uses the
-- approval once.
--
-- Rules:
-- - A request belongs to one signed-in, unlocked session, and only that
--   session can approve, decline or use it.
-- - It lasts 10 minutes. An approval must be used within 5 minutes of being
--   given, and only once.
-- - Face ID: the phone's own passkey signs a fresh challenge, with the person
--   verified; the counter must move forward, as at sign-in.
-- - The code: the sign-up rules (60 seconds, a new one after 30, at most 5
--   in 12 hours). 5 wrong codes in all, across resends, stop the request.

-- ---------------------------------------------------------------------------
-- Rules
-- ---------------------------------------------------------------------------

create function public.approval_rules()
returns table (
  life interval, use_within interval, code_life interval, resend_after interval,
  codes_per_window integer, code_window interval, tries integer
)
language sql
immutable
set search_path = ''
as $$
  select interval '10 minutes', interval '5 minutes', interval '60 seconds',
         interval '30 seconds', 5, interval '12 hours', 5
$$;

-- ---------------------------------------------------------------------------
-- Requests
-- ---------------------------------------------------------------------------

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  -- What is being approved, and its details for the screen (the amount in
  -- minor units, where the money goes).
  kind text not null check (kind ~ '^[a-z_]{3,40}$'),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  -- Where the person goes once it is decided: one of our own paths (never
  -- "//somewhere", which a browser reads as another site).
  return_path text not null check (return_path ~ '^/([A-Za-z0-9_-][A-Za-z0-9/_-]{0,199})?$'),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined', 'failed', 'used')),
  method text check (method in ('passkey', 'code')),
  -- Face ID's one-time challenge.
  challenge text check (challenge is null or challenge ~ '^[A-Za-z0-9_-]{16,128}$'),
  challenge_at timestamptz,
  -- The backup code.
  code_hash bytea check (code_hash is null or octet_length(code_hash) = 32),
  code_sent_at timestamptz,
  code_expires_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes',
  decided_at timestamptz,
  used_at timestamptz,
  check ((challenge is null) = (challenge_at is null)),
  check ((status = 'pending') = (decided_at is null)),
  check ((status = 'approved' or status = 'used') = (method is not null)),
  check ((status = 'used') = (used_at is not null))
);

create index approvals_by_session on public.approvals (session_id, created_at desc);

-- Every code sent, for the limit per account.
create table public.approval_codes (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  sent_at timestamptz not null default now()
);
create index approval_codes_user_sent on public.approval_codes (user_id, sent_at desc);

comment on table public.approvals is
  'Requests to approve a risky action (ACC 5), and how each was decided. Server only.';

alter table public.approvals enable row level security;
alter table public.approval_codes enable row level security;
revoke all on public.approvals, public.approval_codes from public, anon, authenticated;

-- The session behind a cookie, unlocked, with its id.
create function public.approval_session(session_token_hash bytea)
returns table (session_id uuid, user_id uuid, device_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
begin
  select * into s from public.session_unlocked(session_token_hash);
  return query
    select x.id, s.user_id, s.device_id from public.sessions x
     where x.token_hash = session_token_hash and x.ended_at is null;
end;
$$;

-- A screen asks for approval. Returns the request's id.
create function public.approval_create(
  session_token_hash bytea, new_kind text, new_details jsonb, new_return_path text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  made uuid;
begin
  select * into s from public.approval_session(session_token_hash);
  if s.session_id is null then
    raise exception 'There is no unlocked session here.' using errcode = '42501';
  end if;
  insert into public.approvals (user_id, session_id, kind, details, return_path, expires_at)
  values (s.user_id, s.session_id, new_kind, coalesce(new_details, '{}'::jsonb), new_return_path,
          now() + (select life from public.approval_rules()))
  returning id into made;
  insert into public.audit_log (actor_id, subject_id, action, details, device_id)
  values (s.user_id, s.user_id, 'approval.requested',
          jsonb_build_object('approval', made, 'kind', new_kind), s.device_id);
  return made;
end;
$$;

-- This session's request, if it is still waiting. Locks it.
create function public.approval_pending(session_token_hash bytea, request uuid)
returns public.approvals
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  a public.approvals%rowtype;
begin
  select * into s from public.approval_session(session_token_hash);
  select * into a from public.approvals x
   where x.id = request and x.session_id = s.session_id
     and x.status = 'pending' and x.expires_at > now()
     for update;
  if a.id is null then
    raise exception 'There is no approval waiting here.' using errcode = '42501';
  end if;
  return a;
end;
$$;

-- What the screens show. status is 'expired' for a request that ran out
-- while waiting. Nothing for another session's request.
create function public.approval_get(session_token_hash bytea, request uuid)
returns table (
  kind text, details jsonb, status text, return_path text, expires_at timestamptz,
  has_passkey boolean, phone text, code_expires_at timestamptz, code_resend_at timestamptz,
  tries_left integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  rules record;
begin
  select * into s from public.approval_session(session_token_hash);
  select * into rules from public.approval_rules();
  return query
    select a.kind, a.details,
           case when a.status = 'pending' and a.expires_at <= now() then 'expired' else a.status end,
           a.return_path, a.expires_at,
           exists (select 1 from public.passkeys k where k.device_id = s.device_id),
           '+' || u.phone,
           a.code_expires_at, a.code_sent_at + rules.resend_after,
           greatest(rules.tries - a.attempts, 0)
      from public.approvals a join auth.users u on u.id = a.user_id
     where a.id = request and a.session_id = s.session_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Face ID (5.01)
-- ---------------------------------------------------------------------------

-- A fresh challenge for this phone's passkeys. Returns them.
create function public.approval_passkey_begin(session_token_hash bytea, request uuid, new_challenge text)
returns table (credential_id text, transports text[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.approvals%rowtype := public.approval_pending(session_token_hash, request);
  s record;
begin
  if new_challenge is null or new_challenge !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'That isn''t a challenge.' using errcode = '22023';
  end if;
  select * into s from public.approval_session(session_token_hash);
  update public.approvals set challenge = new_challenge, challenge_at = now() where id = a.id;
  return query
    select k.credential_id, k.transports from public.passkeys k where k.device_id = s.device_id;
end;
$$;

-- The passkey's public half and the challenge, used up as it is read.
create function public.approval_passkey_key(session_token_hash bytea, request uuid, used_credential_id text)
returns table (public_key bytea, sign_count bigint, challenge text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.approvals%rowtype := public.approval_pending(session_token_hash, request);
  s record;
  issued text := a.challenge;
begin
  select * into s from public.approval_session(session_token_hash);
  update public.approvals set challenge = null, challenge_at = null where id = a.id;
  if a.challenge_at is null or a.challenge_at <= now() - (select challenge_life from public.signin_rules()) then
    issued := null;
  end if;
  return query
    select k.public_key, k.sign_count, issued
      from public.passkeys k
     where k.device_id = s.device_id and k.credential_id = used_credential_id;
end;
$$;

-- The phone's answer was genuine: approved, unless the counter went
-- backwards (a copied passkey), which is refused and recorded.
create function public.approval_passkey_finish(
  session_token_hash bytea, request uuid, used_credential_id text, new_sign_count bigint
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.approvals%rowtype := public.approval_pending(session_token_hash, request);
  s record;
  key public.passkeys%rowtype;
begin
  select * into s from public.approval_session(session_token_hash);
  select * into key from public.passkeys k
   where k.device_id = s.device_id and k.credential_id = used_credential_id
     for update;
  if key.id is null then
    raise exception 'That passkey doesn''t belong to this phone.' using errcode = '42501';
  end if;
  if new_sign_count is null or new_sign_count < 0
     or ((key.sign_count > 0 or new_sign_count > 0) and new_sign_count <= key.sign_count) then
    insert into public.audit_log (actor_id, subject_id, action, details, device_id)
    values (null, a.user_id, 'approval.passkey_refused',
            jsonb_build_object('approval', a.id, 'reason', 'counter'), s.device_id);
    return false;
  end if;
  update public.passkeys set sign_count = new_sign_count, last_used_at = now() where id = key.id;
  update public.approvals
     set status = 'approved', method = 'passkey', decided_at = now()
   where id = a.id;
  insert into public.audit_log (actor_id, subject_id, action, details, device_id)
  values (a.user_id, a.user_id, 'approval.approved',
          jsonb_build_object('approval', a.id, 'kind', a.kind, 'method', 'passkey'), s.device_id);
  return true;
end;
$$;

-- An answer that failed the server's checks: recorded, nothing else.
create function public.approval_passkey_refused(session_token_hash bytea, request uuid, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.approvals%rowtype := public.approval_pending(session_token_hash, request);
  s record;
begin
  select * into s from public.approval_session(session_token_hash);
  insert into public.audit_log (actor_id, subject_id, action, details, device_id)
  values (null, a.user_id, 'approval.passkey_refused',
          jsonb_build_object('approval', a.id, 'reason', left(coalesce(reason, ''), 40)), s.device_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- The backup code (5.02, 5.02b)
-- ---------------------------------------------------------------------------

--   sent      the server sends it (or, in test mode, shows it)
--   too_soon  wait until resend_at
--   limit     no more to this account until retry_at
create function public.approval_send_code(session_token_hash bytea, request uuid, new_code_hash bytea)
returns table (status text, expires_at timestamptz, resend_at timestamptz, retry_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.approvals%rowtype := public.approval_pending(session_token_hash, request);
  rules record;
  recent integer;
  oldest timestamptz;
begin
  select * into rules from public.approval_rules();
  if new_code_hash is null or octet_length(new_code_hash) <> 32 then
    raise exception 'A code must arrive as a 32-byte hash.' using errcode = '22023';
  end if;
  if a.code_sent_at > now() - rules.resend_after then
    return query select 'too_soon'::text, a.code_expires_at,
                        a.code_sent_at + rules.resend_after, null::timestamptz;
    return;
  end if;
  select count(*), min(c.sent_at) into recent, oldest from public.approval_codes c
   where c.user_id = a.user_id and c.sent_at > now() - rules.code_window;
  if recent >= rules.codes_per_window then
    return query select 'limit'::text, null::timestamptz, null::timestamptz,
                        oldest + rules.code_window;
    return;
  end if;
  insert into public.approval_codes (user_id) values (a.user_id);
  -- A new code; the wrong tries so far still count.
  update public.approvals
     set code_hash = new_code_hash, code_sent_at = now(), code_expires_at = now() + rules.code_life
   where id = a.id;
  return query select 'sent'::text, now() + rules.code_life,
                      now() + rules.resend_after, null::timestamptz;
end;
$$;

--   approved  done
--   wrong     try again; tries_left says how many remain
--   failed    the last try: the request is stopped
--   expired   ask for a new code
create function public.approval_verify(session_token_hash bytea, request uuid, try_hash bytea)
returns table (outcome text, tries_left integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.approvals%rowtype := public.approval_pending(session_token_hash, request);
  s record;
  tries integer := (select r.tries from public.approval_rules() r);
begin
  select * into s from public.approval_session(session_token_hash);
  if a.code_hash is null or a.code_expires_at <= now() then
    return query select 'expired'::text, tries - a.attempts;
    return;
  end if;
  if try_hash is distinct from a.code_hash then
    if a.attempts + 1 >= tries then
      update public.approvals
         set attempts = attempts + 1, status = 'failed', decided_at = now(), code_hash = null
       where id = a.id;
      insert into public.audit_log (actor_id, subject_id, action, details, device_id)
      values (a.user_id, a.user_id, 'approval.failed',
              jsonb_build_object('approval', a.id, 'kind', a.kind), s.device_id);
      return query select 'failed'::text, 0;
      return;
    end if;
    update public.approvals set attempts = attempts + 1 where id = a.id;
    return query select 'wrong'::text, tries - a.attempts - 1;
    return;
  end if;
  update public.approvals
     set status = 'approved', method = 'code', decided_at = now(), code_hash = null
   where id = a.id;
  insert into public.audit_log (actor_id, subject_id, action, details, device_id)
  values (a.user_id, a.user_id, 'approval.approved',
          jsonb_build_object('approval', a.id, 'kind', a.kind, 'method', 'code'), s.device_id);
  return query select 'approved'::text, tries - a.attempts;
end;
$$;

-- ---------------------------------------------------------------------------
-- Declining, and using an approval
-- ---------------------------------------------------------------------------

create function public.approval_decline(session_token_hash bytea, request uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.approvals%rowtype := public.approval_pending(session_token_hash, request);
  s record;
begin
  select * into s from public.approval_session(session_token_hash);
  update public.approvals
     set status = 'declined', decided_at = now(), challenge = null, challenge_at = null, code_hash = null
   where id = a.id;
  insert into public.audit_log (actor_id, subject_id, action, details, device_id)
  values (a.user_id, a.user_id, 'approval.declined',
          jsonb_build_object('approval', a.id, 'kind', a.kind), s.device_id);
end;
$$;

-- The screen that asked uses the approval: once, by the same session, for
-- the same kind of action, within 5 minutes. Returns its details, or null.
create function public.approval_use(session_token_hash bytea, request uuid, expected_kind text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  a public.approvals%rowtype;
begin
  select * into s from public.approval_session(session_token_hash);
  select * into a from public.approvals x
   where x.id = request and x.session_id = s.session_id and x.kind = expected_kind
     and x.status = 'approved'
     and x.decided_at > now() - (select use_within from public.approval_rules())
     for update;
  if a.id is null then
    return null;
  end if;
  update public.approvals set status = 'used', used_at = now() where id = a.id;
  return a.details;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on function
  public.approval_rules(),
  public.approval_session(bytea),
  public.approval_create(bytea, text, jsonb, text),
  public.approval_pending(bytea, uuid),
  public.approval_get(bytea, uuid),
  public.approval_passkey_begin(bytea, uuid, text),
  public.approval_passkey_key(bytea, uuid, text),
  public.approval_passkey_finish(bytea, uuid, text, bigint),
  public.approval_passkey_refused(bytea, uuid, text),
  public.approval_send_code(bytea, uuid, bytea),
  public.approval_verify(bytea, uuid, bytea),
  public.approval_decline(bytea, uuid),
  public.approval_use(bytea, uuid, text)
  from public, anon, authenticated;

grant execute on function
  public.approval_rules(),
  public.approval_get(bytea, uuid),
  public.approval_create(bytea, text, jsonb, text),
  public.approval_passkey_begin(bytea, uuid, text),
  public.approval_passkey_key(bytea, uuid, text),
  public.approval_passkey_finish(bytea, uuid, text, bigint),
  public.approval_passkey_refused(bytea, uuid, text),
  public.approval_send_code(bytea, uuid, bytea),
  public.approval_verify(bytea, uuid, bytea),
  public.approval_decline(bytea, uuid),
  public.approval_use(bytea, uuid, text)
  to service_role;
