import { createHash, randomBytes, randomInt } from "node:crypto";

import { hash } from "@node-rs/argon2";
import postgres from "postgres";

/**
 * Test accounts for the sign-in tests (W2), made in the throwaway database
 * (scripts/db/test-db.mjs) the same way the app's sign-up makes them. Each
 * test makes its own, so locking or freezing one never touches another.
 */
export const DATABASE_URL = process.env.E2E_DATABASE_URL;
export const hasDatabase = Boolean(DATABASE_URL);

let client: postgres.Sql | null = null;
export const db = () => (client ??= postgres(DATABASE_URL!, { max: 2, onnotice: () => {} }));

const sha = (text: string) => createHash("sha256").update(text).digest();

export const PASSWORD = "correct horse battery staple";

export interface TestAccount {
  userId: string;
  name: string;
  alias: string;
  phone: string;
  /** As people type it at home: 0801 234 5678. */
  localPhone: string;
  cyberxId: string;
  deviceId: string;
}

export async function createAccount({
  name = "Ayora Okafor",
  appSignedIn = true,
}: { name?: string; appSignedIn?: boolean } = {}): Promise<TestAccount> {
  const secret = `e2e-${randomBytes(8).toString("hex")}`;
  const national = `80${String(randomInt(0, 100_000_000)).padStart(8, "0")}`;
  const phone = `+234${national}`;
  const alias = `ada${randomBytes(4).toString("hex")}`;
  const token = sha(secret);
  const passwordHash = await hash(PASSWORD, {
    algorithm: 2,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
  return db().begin(async (transaction) => {
    const sql = transaction as unknown as postgres.Sql;
    await sql`select public.signup_begin(${token})`;
    await sql`select public.signup_record_consents(${token}, '2026-09-14', true, true, true, true, false)`;
    await sql`select public.signup_set_name(${token}, ${name})`;
    await sql`select public.signup_set_phone(${token}, ${phone}, false)`;
    await sql`select public.signup_send_code(${token}, ${sha(`${secret}:123456`)})`;
    await sql`select public.signup_verify_code(${token}, ${sha(`${secret}:123456`)})`;
    await sql`update public.signup_codes set sent_at = sent_at - interval '1 minute' where phone = ${phone}`;
    await sql`select public.signup_skip_email(${token})`;
    await sql`select public.signup_skip_passkey(${token})`;
    await sql`select public.signup_create_account(${token}, ${passwordHash}, 'iPhone', 'ios')`;
    await sql`select public.signup_bind_device(${token}, ${sha(`${secret}:phone`)})`;
    const [owner] = await sql`select user_id from public.signups where token_hash = ${token}`;
    const userId = owner!.user_id as string;
    await sql`update public.profiles set alias = ${alias} where id = ${userId}`;
    if (appSignedIn) {
      await sql`select null from public.signin_password_result(
        ${sha(`${secret}:phone`)}, true, ${sha(`${secret}:app`)}, false)`;
    }
    const [row] = await sql`
      select p.cyberx_id, d.id as device_id from public.profiles p
        join public.devices d on d.user_id = p.id where p.id = ${userId}`;
    return {
      userId,
      name,
      alias,
      phone,
      localPhone: `0${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`,
      cyberxId: row!.cyberx_id as string,
      deviceId: row!.device_id as string,
    };
  });
}

/** The account's status in the app's own records ("active", "frozen_by_user"…). */
export async function accountStatus(userId: string): Promise<string> {
  const [row] = await db()`select status::text from public.profiles where id = ${userId}`;
  return row!.status as string;
}

/** How many app sessions are live for the account. */
export async function liveAppSessions(userId: string): Promise<number> {
  const [row] = await db()`
    select count(*)::int as n from public.sessions where user_id = ${userId} and ended_at is null`;
  return row!.n as number;
}
