import "server-only";

import { asWebsite } from "@/lib/db";

import type { Who } from "./identity";

/**
 * The website's sign-in, through the web functions only (W2). Every value
 * that leaves here is what one page may show: never a balance, never a hash
 * the page could see (the password hash is compared on this server and goes
 * no further).
 */

const date = (value: unknown): Date | null => (value instanceof Date ? value : null);

export interface Started {
  pausedUntil: Date | null;
  passwordHash: string | null;
  lockedUntil: Date | null;
}

export async function startSignin(
  token: Buffer,
  visitor: Buffer,
  who: Who,
  how: "password" | "code",
): Promise<Started> {
  const [row] = await asWebsite(
    (sql) =>
      sql`select * from web.signin_start(${token}, ${visitor}, ${who.kind}, ${who.value}, ${how})`,
  );
  return {
    pausedUntil: date(row?.paused_until),
    passwordHash: (row?.password_hash as string | null) ?? null,
    lockedUntil: date(row?.locked_until),
  };
}

export type PasswordOutcome =
  "code_needed" | "wrong" | "locked" | "paused" | "frozen" | "unavailable" | "gone";

export async function passwordResult(token: Buffer, correct: boolean) {
  const [row] = await asWebsite(
    (sql) => sql`select * from web.signin_password(${token}, ${correct})`,
  );
  return {
    outcome: (row?.outcome ?? "gone") as PasswordOutcome,
    triesLeft: (row?.tries_left as number | null) ?? null,
    until: date(row?.until),
  };
}

export async function sendCode(token: Buffer, newCodeHash: Buffer) {
  const [row] = await asWebsite(
    (sql) => sql`select * from web.signin_send_code(${token}, ${newCodeHash})`,
  );
  return {
    status: (row?.status ?? "gone") as "sent" | "too_soon" | "limit" | "gone",
    deliver: Boolean(row?.deliver),
    phone: (row?.phone as string | null) ?? null,
    shownPhone: Boolean(row?.shown_phone),
    expiresAt: date(row?.expires_at),
    resendAt: date(row?.resend_at),
    retryAt: date(row?.retry_at),
  };
}

export type CodeOutcome =
  "signed_in" | "wrong" | "expired" | "stopped" | "paused" | "frozen" | "unavailable" | "gone";

export async function verifyCode(token: Buffer, tryHash: Buffer, session: Buffer, browser: string) {
  const [row] = await asWebsite(
    (sql) =>
      sql`select * from web.signin_verify_code(${token}, ${tryHash}, ${session}, ${browser})`,
  );
  return {
    outcome: (row?.outcome ?? "gone") as CodeOutcome,
    triesLeft: (row?.tries_left as number | null) ?? null,
    until: date(row?.until),
  };
}

export async function passkeyStart(token: Buffer, visitor: Buffer, challenge: string) {
  const [row] = await asWebsite(
    (sql) => sql`select web.passkey_start(${token}, ${visitor}, ${challenge}) as paused_until`,
  );
  return date(row?.paused_until);
}

export async function passkeyKey(token: Buffer, credentialId: string) {
  const [row] = await asWebsite(
    (sql) => sql`select * from web.passkey_key(${token}, ${credentialId})`,
  );
  if (!row) return null;
  return {
    publicKey: new Uint8Array(row.public_key as Buffer),
    signCount: Number(row.sign_count),
    challenge: row.challenge as string,
  };
}

export async function passkeyResult(args: {
  token: Buffer;
  credentialId: string;
  verified: boolean;
  newCount: number | null;
  session: Buffer;
  browser: string;
}) {
  const [row] = await asWebsite(
    (sql) => sql`select * from web.passkey_result(
      ${args.token}, ${args.credentialId}, ${args.verified}, ${args.newCount}, ${args.session}, ${args.browser})`,
  );
  return {
    outcome: (row?.outcome ?? "gone") as
      "signed_in" | "refused" | "paused" | "frozen" | "unavailable" | "gone",
    until: date(row?.until),
  };
}

export interface SessionRow {
  displayName: string | null;
  cyberxId: string;
  alias: string | null;
  tier: number;
  phone: string;
  method: "password" | "code" | "passkey";
  browser: string;
}

export async function sessionGet(session: Buffer): Promise<SessionRow | null> {
  const [row] = await asWebsite((sql) => sql`select * from web.session_get(${session})`);
  if (!row) return null;
  return {
    displayName: (row.display_name as string | null) ?? null,
    cyberxId: row.cyberx_id as string,
    alias: (row.alias as string | null) ?? null,
    tier: Number(row.tier),
    phone: row.phone as string,
    method: row.method as SessionRow["method"],
    browser: row.browser as string,
  };
}

export async function sessionEnd(session: Buffer): Promise<void> {
  await asWebsite((sql) => sql`select web.session_end(${session})`);
}

export interface Place {
  id: string;
  kind: "phone" | "browser";
  label: string;
  platform: string;
  signedIn: boolean;
  thisBrowser: boolean;
  lastSeenAt: Date | null;
}

export async function accountPlaces(session: Buffer): Promise<Place[]> {
  const rows = await asWebsite((sql) => sql`select * from web.account_places(${session})`);
  return rows.map((row) => ({
    id: row.place_id as string,
    kind: row.kind as Place["kind"],
    label: row.label as string,
    platform: row.platform as string,
    signedIn: Boolean(row.signed_in),
    thisBrowser: Boolean(row.this_browser),
    lastSeenAt: date(row.last_seen_at),
  }));
}

export interface SignIn {
  at: Date;
  place: "app" | "website";
  label: string;
}

export async function accountSignins(session: Buffer, howMany: number): Promise<SignIn[]> {
  const rows = await asWebsite(
    (sql) => sql`select * from web.account_signins(${session}, ${howMany})`,
  );
  return rows.map((row) => ({
    at: row.signed_in_at as Date,
    place: row.place as SignIn["place"],
    label: row.label as string,
  }));
}

export async function signOutPhone(session: Buffer, phoneId: string): Promise<number> {
  const [row] = await asWebsite(
    (sql) => sql`select web.account_sign_out_phone(${session}, ${phoneId}::uuid) as ended`,
  );
  return Number(row?.ended ?? 0);
}

export async function freezeAccount(session: Buffer): Promise<Date | null> {
  const [row] = await asWebsite((sql) => sql`select web.freeze(${session}) as frozen_at`);
  return date(row?.frozen_at);
}
