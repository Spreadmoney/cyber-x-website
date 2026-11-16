-- ===========================================================================
-- M2 Sign-in, part 5: moving an account to a new phone (ACC 6), and
-- recovering it when the old phone is lost (ACC 9)
--
-- Cyber X works on one phone at a time (CBN). A move is one request, held
-- by the new phone's browser (cx_move):
--
--   new phone (ACC 6)   the number, the Cyber X ID or alias and the password
--                       together (nothing is said about which part is
--                       wrong), a code to the number, a selfie (SIMULATED
--                       until M3), the Payment PIN if there is one, then
--                       the old phone says "Yes, it's me" (or the team
--                       does, after a video call).
--   lost phone (ACC 9)  the number, a code to it, a selfie, the team
--                       confirms it's the owner (recovery contacts arrive
--                       with M15), then a new password.
--
-- When it is approved, the new phone becomes the account's only active
-- phone, every other session ends, and the first-24-hours cap counts from
-- this moment (devices.activated_at). The old phone says it has moved, and
-- offers to freeze the account.
-- ===========================================================================

alter table public.account_freezes drop constraint account_freezes_source_check;
alter table public.account_freezes add constraint account_freezes_source_check
  check (source in ('owner_code', 'owner_phone'));

create table public.phone_moves (
  id uuid primary key default gen_random_uuid(),
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  kind text not null check (kind in ('new_phone', 'lost_phone')),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  -- The account with that number, if any. Never shown before it is proved.
  user_id uuid references public.profiles (id) on delete cascade,
  device_label text not null check (char_length(btrim(device_label)) between 1 and 80),
  device_platform text not null check (device_platform in ('ios', 'android', 'web')),
  step text not null check (step in ('details', 'code', 'selfie', 'pin', 'approve', 'password', 'done')),
  -- The Cyber X ID or alias typed on ACC 6.02, kept for 6.03 (not checked
  -- until the password is given with it).
  identifier text check (identifier is null or char_length(identifier) <= 40),
  -- Wrong ID, alias or password on this request (ACC 6.02–6.03).
  detail_attempts smallint not null default 0 check (detail_attempts between 0 and 5),
  code_hash bytea check (code_hash is null or octet_length(code_hash) = 32),
  code_sent_at timestamptz,
  code_expires_at timestamptz,
  attempts smallint not null default 0 check (attempts between 0 and 5),
  selfie text check (selfie in ('simulated')),
  approve_expires_at timestamptz,
  approved_by text check (approved_by in ('old_phone', 'staff')),
  approved_at timestamptz,
  approver uuid references public.profiles (id) on delete set null,
  approve_note text,
  -- The old phone said no: the account was frozen and the move stopped.
  refused_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '60 minutes',
  done_at timestamptz,
  new_device_id uuid references public.devices (id) on delete set null
);

create index phone_moves_user_waiting on public.phone_moves (user_id) where step = 'approve';

comment on table public.phone_moves is
  'Requests to move an account to a new phone (ACC 6, 9). Server only.';

alter table public.phone_moves enable row level security;
revoke all on public.phone_moves from public, anon, authenticated;

create function public.move_rules()
returns table (approve_window interval, detail_tries integer)
language sql
immutable
set search_path = ''
as $$
  -- The old phone (or the team) has 15 minutes to approve; 5 tries at the
  -- ID and password on one request.
  select interval '15 minutes', 5
$$;

-- The running request behind a browser's secret, locked for this step.
create function public.move_request(token bytea)
returns public.phone_moves
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.phone_moves%rowtype;
begin
  select * into m from public.phone_moves x
   where x.token_hash = token and x.expires_at > now() and x.done_at is null and x.refused_at is null
     for update;
  if m.id is null then
    raise exception 'There is no phone move here.' using errcode = '42501';
  end if;
  return m;
end;
$$;

-- ---------------------------------------------------------------------------
-- Starting: the number (ACC 4.02b, 9.02)
-- ---------------------------------------------------------------------------

create function public.move_begin(
  token bytea,
  what text,
  number text,
  label text,
  platform text
)
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
  if what not in ('new_phone', 'lost_phone') then
    raise exception 'That isn''t a kind of move.' using errcode = '22023';
  end if;
  if number is null or number !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'That isn''t a phone number.' using errcode = '22023';
  end if;
  select u.id into owner from auth.users u join public.profiles p on p.id = u.id
   where u.phone = ltrim(number, '+');
  insert into public.phone_moves (token_hash, kind, phone, user_id, device_label, device_platform, step)
  values (token, what, number, owner, label, platform,
          case what when 'new_phone' then 'details' else 'code' end)
  on conflict (token_hash) do update
    set kind = excluded.kind, phone = excluded.phone, user_id = excluded.user_id,
        device_label = excluded.device_label, device_platform = excluded.device_platform,
        step = excluded.step, identifier = null, detail_attempts = 0, code_hash = null, code_sent_at = null,
        code_expires_at = null, attempts = 0, selfie = null, approve_expires_at = null,
        approved_by = null, approved_at = null, approver = null, approve_note = null,
        refused_at = null, created_at = now(), expires_at = now() + interval '60 minutes',
        done_at = null, new_device_id = null;
end;
$$;

-- ---------------------------------------------------------------------------
-- New phone: the Cyber X ID or alias, and the password (ACC 6.02–6.03)
-- ---------------------------------------------------------------------------

-- ACC 6.02: the Cyber X ID or alias, kept until the password comes.
create function public.move_set_identifier(token bytea, id_or_alias text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.phone_moves%rowtype := public.move_request(token);
begin
  if m.kind <> 'new_phone' or m.step <> 'details' then
    raise exception 'Not at the details step.' using errcode = '42501';
  end if;
  if id_or_alias is null or char_length(btrim(id_or_alias)) not between 1 and 40 then
    raise exception 'That isn''t a Cyber X ID or alias.' using errcode = '22023';
  end if;
  update public.phone_moves set identifier = btrim(id_or_alias) where id = m.id;
end;
$$;

-- The password hash to compare, only when the number and the ID or alias
-- belong to the same account; otherwise no row. The server compares either
-- way, so a wrong ID takes as long as a wrong password.
create function public.move_password_hash(token bytea)
returns table (password_hash text, locked_until timestamptz, account_status public.account_status)
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.phone_moves%rowtype := public.move_request(token);
  clean text;
begin
  if m.kind <> 'new_phone' or m.step <> 'details' or m.identifier is null then
    raise exception 'Not at the details step.' using errcode = '42501';
  end if;
  clean := m.identifier;
  return query
    select u.encrypted_password::text,
           (select g.locked_until from public.signin_guards g
             where g.user_id = p.id and g.locked_until > now()),
           p.status
      from public.profiles p join auth.users u on u.id = p.id
     where p.id = m.user_id
       and (p.cyberx_id = upper(clean) or p.alias = lower(ltrim(clean, '@')));
end;
$$;

-- ok | wrong | locked | frozen | finished (too many wrong tries)
-- matched: the number and ID belong together. correct: and the password is right.
create function public.move_details_result(token bytea, matched boolean, correct boolean)
returns table (outcome text, locked_until timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.phone_moves%rowtype := public.move_request(token);
  rules record;
  g public.signin_guards%rowtype;
  state public.account_status;
  level smallint;
  until timestamptz;
  tries integer := (select detail_tries from public.move_rules());
begin
  if m.kind <> 'new_phone' or m.step <> 'details' then
    raise exception 'Not at the details step.' using errcode = '42501';
  end if;
  select * into rules from public.signin_rules();

  if matched then
    select p.status into state from public.profiles p where p.id = m.user_id;
    insert into public.signin_guards (user_id) values (m.user_id) on conflict do nothing;
    select * into g from public.signin_guards where user_id = m.user_id for update;
    if g.locked_until > now() then
      return query select 'locked'::text, g.locked_until;
      return;
    end if;
    if correct then
      if state <> 'active' then
        return query select 'frozen'::text, null::timestamptz;
        return;
      end if;
      update public.signin_guards set failures = 0 where user_id = m.user_id;
      update public.phone_moves set step = 'code' where id = m.id;
      insert into public.audit_log (actor_id, subject_id, action, details)
      values (m.user_id, m.user_id, 'move.started',
              jsonb_build_object('kind', m.kind, 'device', m.device_label));
      return query select 'ok'::text, null::timestamptz;
      return;
    end if;
    -- A wrong password for a real account counts towards its sign-in lock.
    if g.failures + 1 >= rules.tries then
      level := case when g.last_locked_at > now() - interval '24 hours'
                    then least(g.lock_level + 1, 20) else 1 end;
      until := now() + least(rules.first_lock * power(2, level - 1), rules.longest_lock);
      update public.signin_guards
         set failures = 0, locked_until = until, lock_level = level, last_locked_at = now()
       where user_id = m.user_id;
      insert into public.audit_log (actor_id, subject_id, action, details)
      values (null, m.user_id, 'signin.locked', jsonb_build_object('until', until, 'via', 'new_phone'));
      return query select 'locked'::text, until;
      return;
    end if;
    update public.signin_guards set failures = failures + 1 where user_id = m.user_id;
    insert into public.audit_log (actor_id, subject_id, action, details)
    values (null, m.user_id, 'signin.password_wrong', jsonb_build_object('via', 'new_phone'));
  end if;

  update public.phone_moves set detail_attempts = detail_attempts + 1 where id = m.id;
  if m.detail_attempts + 1 >= tries then
    update public.phone_moves set expires_at = now() where id = m.id;
    return query select 'finished'::text, null::timestamptz;
    return;
  end if;
  return query select 'wrong'::text, null::timestamptz;
end;
$$;

-- ---------------------------------------------------------------------------
-- The code (ACC 6.04; 9.02 step 1)
-- ---------------------------------------------------------------------------

-- deliver: whether a real account will get it (the lost-phone path asks
-- for a code before anything is proved, so a number with no account goes
-- through the same steps and is never told).
create function public.move_send_code(token bytea, new_code_hash bytea)
returns table (status text, deliver boolean, expires_at timestamptz, resend_at timestamptz, retry_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.phone_moves%rowtype := public.move_request(token);
  rules record;
  recent integer;
  oldest timestamptz;
begin
  select * into rules from public.freeze_rules();
  if m.step <> 'code' then
    raise exception 'Not at the code step.' using errcode = '42501';
  end if;
  if new_code_hash is null or octet_length(new_code_hash) <> 32 then
    raise exception 'A code must arrive as a 32-byte hash.' using errcode = '22023';
  end if;
  if m.code_sent_at > now() - rules.resend_after then
    return query select 'too_soon'::text, false, m.code_expires_at,
                        m.code_sent_at + rules.resend_after, null::timestamptz;
    return;
  end if;
  if m.user_id is not null then
    select count(*), min(c.sent_at) into recent, oldest from public.recovery_codes c
     where c.user_id = m.user_id and c.sent_at > now() - rules.code_window;
  else
    select count(*), min(c.sent_at) into recent, oldest from public.freeze_codes c
     where c.phone = m.phone and c.sent_at > now() - rules.code_window;
  end if;
  if recent >= rules.codes_per_window then
    return query select 'limit'::text, false, null::timestamptz, null::timestamptz,
                        oldest + rules.code_window;
    return;
  end if;
  if m.user_id is not null then
    insert into public.recovery_codes (user_id) values (m.user_id);
  else
    insert into public.freeze_codes (phone) values (m.phone);
  end if;
  update public.phone_moves
     set code_hash = new_code_hash, code_sent_at = now(),
         code_expires_at = now() + rules.code_life, attempts = 0
   where id = m.id;
  return query select 'sent'::text, m.user_id is not null, now() + rules.code_life,
                      now() + rules.resend_after, null::timestamptz;
end;
$$;

-- ok | wrong | burned | expired
create function public.move_verify(token bytea, try_hash bytea)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.phone_moves%rowtype := public.move_request(token);
  tries integer := (select f.tries from public.freeze_rules() f);
begin
  if m.step <> 'code' then
    raise exception 'Not at the code step.' using errcode = '42501';
  end if;
  if m.code_hash is null or m.code_expires_at <= now() then
    return 'expired';
  end if;
  if m.attempts >= tries then
    return 'burned';
  end if;
  if m.user_id is null or try_hash is distinct from m.code_hash then
    update public.phone_moves set attempts = attempts + 1 where id = m.id;
    return case when m.attempts + 1 >= tries then 'burned' else 'wrong' end;
  end if;
  update public.phone_moves set step = 'selfie', code_hash = null where id = m.id;
  if m.kind = 'lost_phone' then
    insert into public.audit_log (actor_id, subject_id, action, details)
    values (m.user_id, m.user_id, 'move.started',
            jsonb_build_object('kind', m.kind, 'device', m.device_label));
  end if;
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- The selfie (ACC 6.05; 9.02 step 2): simulated until M3
-- ---------------------------------------------------------------------------

create function public.move_selfie_simulated(token bytea)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.phone_moves%rowtype := public.move_request(token);
  next_step text;
begin
  if m.step <> 'selfie' then
    raise exception 'Not at the selfie step.' using errcode = '42501';
  end if;
  next_step := case
    when m.kind = 'new_phone' and public.pin_usable(m.user_id) then 'pin'
    else 'approve' end;
  update public.phone_moves
     set step = next_step, selfie = 'simulated',
         approve_expires_at = case when next_step = 'approve'
                                   then now() + (select approve_window from public.move_rules()) end
   where id = m.id;
  insert into public.audit_log (actor_id, subject_id, action, details)
  values (m.user_id, m.user_id, 'move.selfie', jsonb_build_object('match', 'simulated'));
end;
$$;

-- ---------------------------------------------------------------------------
-- The Payment PIN, if there is one (ACC 6.07)
-- ---------------------------------------------------------------------------

create function public.move_pin_hash(token bytea)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.phone_moves%rowtype := public.move_request(token);
begin
  if m.step <> 'pin' then
    raise exception 'Not at the PIN step.' using errcode = '42501';
  end if;
  return (select p.pin_hash from public.payment_pins p
           where p.user_id = m.user_id and p.locked_at is null);
end;
$$;

-- ok | wrong (tries_left) | pin_locked: the move stops, as on the unlock screen.
create function public.move_pin_result(token bytea, correct boolean)
returns table (outcome text, tries_left integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.phone_moves%rowtype := public.move_request(token);
  pin public.payment_pins%rowtype;
  tries integer := (select pin_tries from public.unlock_rules());
begin
  if m.step <> 'pin' then
    raise exception 'Not at the PIN step.' using errcode = '42501';
  end if;
  select * into pin from public.payment_pins p
   where p.user_id = m.user_id and p.locked_at is null
     for update;
  if correct and pin.user_id is not null then
    update public.payment_pins set failures = 0 where user_id = m.user_id;
    update public.phone_moves
       set step = 'approve', approve_expires_at = now() + (select approve_window from public.move_rules())
     where id = m.id;
    return query select 'ok'::text, tries;
    return;
  end if;
  if pin.user_id is not null and pin.failures + 1 < tries then
    update public.payment_pins set failures = failures + 1 where user_id = m.user_id;
    return query select 'wrong'::text, tries - pin.failures - 1;
    return;
  end if;
  update public.payment_pins set failures = 0, locked_at = coalesce(locked_at, now())
   where user_id = m.user_id;
  update public.phone_moves set expires_at = now() where id = m.id;
  insert into public.audit_log (actor_id, subject_id, action, details)
  values (null, m.user_id, 'pin.locked', jsonb_build_object('via', 'new_phone'));
  return query select 'pin_locked'::text, 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- Approving (ACC 6.06, 6.06b; the team: 6.08d, 9.04)
-- ---------------------------------------------------------------------------

-- On the old phone, signed in: a move waiting for its answer.
create function public.move_waiting_for(session_token_hash bytea)
returns table (request_id uuid, device_label text, requested_at timestamptz, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
begin
  select * into s from public.session_unlocked(session_token_hash);
  return query
    select m.id, m.device_label, m.created_at, m.approve_expires_at
      from public.phone_moves m
     where m.user_id = s.user_id and m.step = 'approve' and m.approved_at is null
       and m.refused_at is null and m.approve_expires_at > now() and m.expires_at > now()
     order by m.created_at desc
     limit 1;
end;
$$;

-- "Yes, it's me" or "No, freeze my account" (ACC 6.06b).
create function public.move_answer(session_token_hash bytea, request uuid, yes boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  m public.phone_moves%rowtype;
begin
  select * into s from public.session_unlocked(session_token_hash);
  select * into m from public.phone_moves x
   where x.id = request and x.user_id = s.user_id and x.step = 'approve'
     and x.approved_at is null and x.refused_at is null
     and x.approve_expires_at > now() and x.expires_at > now()
     for update;
  if m.id is null then
    raise exception 'There is no request waiting.' using errcode = '42501';
  end if;
  if yes then
    update public.phone_moves
       set approved_by = 'old_phone', approved_at = now(), approver = s.user_id,
           step = case kind when 'lost_phone' then 'password' else 'approve' end
     where id = m.id;
    insert into public.audit_log (actor_id, subject_id, action, details, device_id)
    values (s.user_id, s.user_id, 'move.approved', jsonb_build_object('by', 'old_phone'), s.device_id);
  else
    update public.phone_moves set refused_at = now() where id = m.id;
    insert into public.audit_log (actor_id, subject_id, action, details, device_id)
    values (s.user_id, s.user_id, 'move.refused', '{}'::jsonb, s.device_id);
    perform public.account_freeze(s.user_id, 'owner_phone');
  end if;
end;
$$;

-- The team: a move waiting for the account the staff member found.
create function public.staff_move_waiting(session_token_hash bytea, target uuid)
returns table (request_id uuid, kind text, device_label text, requested_at timestamptz, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  staff uuid := public.staff_session(session_token_hash);
begin
  return query
    select m.id, m.kind, m.device_label, m.created_at, m.approve_expires_at
      from public.phone_moves m
     where m.user_id = target and m.step = 'approve' and m.approved_at is null
       and m.refused_at is null and m.approve_expires_at > now() and m.expires_at > now()
     order by m.created_at desc
     limit 1;
end;
$$;

-- The team approves, after a live video call.
create function public.staff_approve_move(
  session_token_hash bytea,
  request uuid,
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
  m public.phone_moves%rowtype;
begin
  if confirmed_on_video is not true then
    raise exception 'Confirm it''s the owner on a video call first.' using errcode = '22023';
  end if;
  if note is null or char_length(btrim(note)) not between 10 and 500 then
    raise exception 'Say what you checked, in 10 to 500 characters.' using errcode = '22023';
  end if;
  select * into m from public.phone_moves x
   where x.id = request and x.step = 'approve' and x.approved_at is null and x.refused_at is null
     and x.approve_expires_at > now() and x.expires_at > now()
     for update;
  if m.id is null then
    raise exception 'There is no request waiting.' using errcode = '22023';
  end if;
  if m.user_id = staff then
    raise exception 'Nobody can approve their own move.' using errcode = '42501';
  end if;
  update public.phone_moves
     set approved_by = 'staff', approved_at = now(), approver = staff, approve_note = btrim(note),
         step = case kind when 'lost_phone' then 'password' else 'approve' end
   where id = m.id;
  insert into public.audit_log (actor_id, subject_id, action, details)
  values (staff, m.user_id, 'move.approved',
          jsonb_build_object('by', 'staff', 'confirmed_on_video', true, 'note', btrim(note)));
end;
$$;

-- ---------------------------------------------------------------------------
-- Finishing: this phone becomes the account's phone (ACC 6.09, 9.06)
-- ---------------------------------------------------------------------------

-- new_password_hash: the lost-phone path's new password (ACC 9.06); null
-- for a new phone. Returns when the new session ends, or null when the
-- account is frozen (it moves, and stays frozen until the team unfreezes it).
create function public.move_finish(
  token bytea,
  device_token_hash bytea,
  session_token_hash bytea,
  new_password_hash text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.phone_moves%rowtype := public.move_request(token);
  new_phone uuid;
  state public.account_status;
  ends timestamptz;
begin
  if m.approved_at is null then
    raise exception 'This move hasn''t been approved.' using errcode = '42501';
  end if;
  if m.kind = 'lost_phone' then
    if new_password_hash is null or new_password_hash !~ '^\$argon2id\$v=19\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$' then
      raise exception 'A new password must arrive as an Argon2id hash.' using errcode = '22023';
    end if;
  end if;
  if device_token_hash is null or octet_length(device_token_hash) <> 32 then
    raise exception 'A phone''s secret must arrive as a 32-byte hash.' using errcode = '22023';
  end if;

  -- One active phone: the old one stops, and every session ends.
  update public.devices set is_active = false, deactivated_at = now()
   where user_id = m.user_id and is_active;
  update public.sessions set ended_at = now(), ended_reason = 'phone_replaced'
   where user_id = m.user_id and ended_at is null;
  insert into public.devices (user_id, label, platform)
  values (m.user_id, m.device_label, m.device_platform)
  returning id into new_phone;
  insert into public.device_keys (device_id, token_hash) values (new_phone, device_token_hash);

  if new_password_hash is not null then
    update auth.users set encrypted_password = new_password_hash, updated_at = now()
     where id = m.user_id;
    update public.profiles set password_unchecked_since = null where id = m.user_id;
    update public.signin_guards set failures = 0, locked_until = null where user_id = m.user_id;
  end if;

  update public.phone_moves set step = 'done', done_at = now(), new_device_id = new_phone where id = m.id;
  insert into public.audit_log (actor_id, subject_id, action, details, device_id)
  values (m.user_id, m.user_id, 'device.moved',
          jsonb_build_object('kind', m.kind, 'approved_by', m.approved_by,
                             'selfie', m.selfie, 'new_password', new_password_hash is not null),
          new_phone);

  select p.status into state from public.profiles p where p.id = m.user_id;
  if state <> 'active' then
    return null;
  end if;
  ends := public.signin_new_session(m.user_id, new_phone, session_token_hash, 'password', false);
  return ends;
end;
$$;

-- Where the move is, for the screens.
create function public.move_state(token bytea)
returns table (
  kind text,
  step text,
  phone text,
  display_name text,
  old_device_label text,
  old_device_last_seen timestamptz,
  code_expires_at timestamptz,
  resend_at timestamptz,
  approve_expires_at timestamptz,
  approved boolean,
  refused boolean,
  done boolean,
  new_device_activated_at timestamptz
)
language sql
security definer
stable
set search_path = ''
as $$
  select m.kind, m.step, m.phone,
         -- Names only once the code has proved the number.
         case when m.step not in ('details', 'code') then p.display_name end,
         case when m.step not in ('details', 'code') then d.label end,
         case when m.step not in ('details', 'code') then d.last_seen_at end,
         m.code_expires_at,
         m.code_sent_at + (select resend_after from public.freeze_rules()),
         m.approve_expires_at,
         m.approved_at is not null,
         m.refused_at is not null,
         m.done_at is not null,
         nd.activated_at
    from public.phone_moves m
    left join public.profiles p on p.id = m.user_id
    left join public.devices d on d.user_id = m.user_id and d.is_active and d.id is distinct from m.new_device_id
    left join public.devices nd on nd.id = m.new_device_id
   where m.token_hash = token
     and (m.done_at is not null or m.refused_at is not null or m.expires_at > now())
$$;

-- ---------------------------------------------------------------------------
-- The old phone, after the move (ACC 6.11)
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
  unfrozen_notice boolean,
  -- This phone was replaced: by which phone, and when (ACC 6.11).
  moved_to text,
  moved_at timestamptz
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
              and f.unfrozen_notice_seen_at is null),
         (select n.label from public.devices n where n.user_id = p.id and n.is_active and not d.is_active),
         (select n.activated_at from public.devices n where n.user_id = p.id and n.is_active and not d.is_active)
    from public.device_keys dk
    join public.devices d on d.id = dk.device_id
    join public.profiles p on p.id = d.user_id
   where dk.token_hash = device_token_hash
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on function
  public.move_rules(),
  public.move_request(bytea),
  public.move_begin(bytea, text, text, text, text),
  public.move_set_identifier(bytea, text),
  public.move_password_hash(bytea),
  public.move_details_result(bytea, boolean, boolean),
  public.move_send_code(bytea, bytea),
  public.move_verify(bytea, bytea),
  public.move_selfie_simulated(bytea),
  public.move_pin_hash(bytea),
  public.move_pin_result(bytea, boolean),
  public.move_waiting_for(bytea),
  public.move_answer(bytea, uuid, boolean),
  public.staff_move_waiting(bytea, uuid),
  public.staff_approve_move(bytea, uuid, boolean, text),
  public.move_finish(bytea, bytea, bytea, text),
  public.move_state(bytea),
  public.signin_device(bytea)
  from public, anon, authenticated;

grant execute on function
  public.move_begin(bytea, text, text, text, text),
  public.move_set_identifier(bytea, text),
  public.move_password_hash(bytea),
  public.move_details_result(bytea, boolean, boolean),
  public.move_send_code(bytea, bytea),
  public.move_verify(bytea, bytea),
  public.move_selfie_simulated(bytea),
  public.move_pin_hash(bytea),
  public.move_pin_result(bytea, boolean),
  public.move_waiting_for(bytea),
  public.move_answer(bytea, uuid, boolean),
  public.staff_move_waiting(bytea, uuid),
  public.staff_approve_move(bytea, uuid, boolean, text),
  public.move_finish(bytea, bytea, bytea, text),
  public.move_state(bytea),
  public.signin_device(bytea)
  to service_role;
