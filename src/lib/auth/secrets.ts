import "server-only";

import { createHash, randomBytes, randomInt } from "node:crypto";

/** A new secret for a cookie: 32 random bytes, as base64url. */
export const newSecret = (): string => randomBytes(32).toString("base64url");

/** What the database keeps instead of a secret. */
export const hashSecret = (secret: string): Buffer => createHash("sha256").update(secret).digest();

/** A 6-digit code, every digit equally likely. */
export const newCode = (): string => String(randomInt(0, 1_000_000)).padStart(6, "0");

/** A code's hash, tied to the sign-in it belongs to (as the app does). */
export const codeHash = (secret: string, code: string): Buffer =>
  createHash("sha256").update(`${secret}:${code}`).digest();

/** One visitor, without keeping their network address. */
export const visitorHash = (address: string): Buffer =>
  createHash("sha256").update(`cyberx-website-visitor:${address}`).digest();

/**
 * Compared against when what was typed matches no account, so a wrong name
 * takes as long as a wrong password (a made-up password's Argon2id hash).
 */
export const DECOY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$nUSRD4YfwabYcAZ6WCN25w$2tzEYdyO87YHcgeYQBTqr9FuXQimNHFtLzWz16MA/t0";

/** A secret cookie value we issued: base64url of 32 bytes. */
export const isSecret = (value: string | undefined): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
