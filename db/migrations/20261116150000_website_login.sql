-- Website · W0.4 · The website's own database login
--
-- The Cyber X website (codebase2) reaches this database with its own login,
-- cyberx_website, never with the app's keys. That login can do one thing:
-- run the functions in the "web" section. Each web function is written for
-- one website page and returns only what that page may show (first names
-- and initials, never a balance). The login can read or change no table, in
-- any section, and can create nothing.
--
-- The web section starts empty. Each website stage adds its own functions
-- here (for example Check a payment, W4) and grants them to the login one by
-- one, with tests.
--
-- The login is created WITHOUT a password, so nobody can sign in with it
-- yet. Its password is set once by hand in Supabase (SQL editor), never in a
-- migration, and kept in the website's .env.local and Vercel only:
--   alter role cyberx_website with password '<a long random password>';

-- Roles belong to the whole server, so create it only once.
do $$
begin
  if not exists (select from pg_roles where rolname = 'cyberx_website') then
    create role cyberx_website login noinherit nosuperuser nocreatedb nocreaterole
      noreplication nobypassrls connection limit 20;
  end if;
end;
$$;

-- A slow or stuck request from the website is stopped, not left running.
alter role cyberx_website set statement_timeout = '5s';
alter role cyberx_website set idle_in_transaction_session_timeout = '10s';

-- The web section: the only place the website can reach.
create schema if not exists web;
comment on schema web is
  'Functions the Cyber X website may run, each returning only what one page may show. Run by the cyberx_website login only.';

revoke all on schema web from public, anon, authenticated;
grant usage on schema web to cyberx_website;

-- Every web function added later is closed first, then opened to the
-- website's login alone:
--   revoke all on function web.<name>(...) from public, anon, authenticated;
--   grant execute on function web.<name>(...) to cyberx_website;
-- (Postgres opens new functions to everyone unless told otherwise; the test
-- 12_website_login fails if a web function is left open.)

-- Nothing in the app's own section, now or later, is the website's.
revoke create on schema public from cyberx_website;
