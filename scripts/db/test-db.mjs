/**
 * Builds a throwaway database for the website's phone and desktop tests:
 * Supabase's stand-in, then every app migration (copied from Codebase by
 * `npm run sync:shared`), the website's web functions included.
 *
 *   E2E_DATABASE_ADMIN_URL=postgres://postgres:postgres@localhost:5432/postgres \
 *     node scripts/db/test-db.mjs
 *
 * Never point it at the real Supabase project: it drops and recreates
 * cyberx_web_e2e on the server it is given, and refuses anything but a
 * local server.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import postgres from "postgres";

const ADMIN = process.env.E2E_DATABASE_ADMIN_URL;
const NAME = process.env.E2E_DATABASE_NAME ?? "cyberx_web_e2e";
if (!ADMIN) {
  console.log("E2E_DATABASE_ADMIN_URL isn't set: the tests that need a database will be skipped.");
  process.exit(0);
}
const host = new URL(ADMIN).hostname;
if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
  console.error(`Refusing to build a test database on ${host}: only a local Postgres.`);
  process.exit(1);
}

const admin = postgres(ADMIN, { max: 1, onnotice: () => {} });
await admin.unsafe(`drop database if exists ${NAME} with (force)`);
await admin.unsafe(`create database ${NAME}`);
await admin.end();

const url = new URL(ADMIN);
url.pathname = `/${NAME}`;
const sql = postgres(url.toString(), { max: 1, onnotice: () => {} });
await sql.unsafe(readFileSync("db/local-supabase-shim.sql", "utf8"));
await sql.unsafe(`alter database ${NAME} set search_path = "$user", public, extensions`);
for (const file of readdirSync("db/migrations")
  .filter((name) => name.endsWith(".sql"))
  .sort()) {
  await sql.unsafe(readFileSync(join("db/migrations", file), "utf8"));
}
await sql.end();
console.log(`Built ${NAME} with every migration.`);
