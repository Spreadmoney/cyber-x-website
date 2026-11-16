import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { CantReachError } from "@/lib/db";

import { firstNameOf, initialsOf, maskedNumber } from "./identity";
import { COOKIES, COOKIE_LIFE } from "./rules";
import { hashSecret, isSecret } from "./secrets";
import { sessionGet, type SessionRow } from "./store";

/** The signed-in person, as the website may show them (W2.3, W2.4). */
export interface Me extends Omit<SessionRow, "phone"> {
  name: string;
  firstName: string;
  initials: string;
  maskedPhone: string | null;
  /** The cookie's secret's hash, for the account functions. */
  sessionHash: Buffer;
}

/** Whether cookies should be sent only over https. */
export function secureCookies(): boolean {
  return (process.env.WEBSITE_URL ?? "").startsWith("https://");
}

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: secureCookies(),
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

/** Who is signed in to the website in this browser, once per request. */
export const getMe = cache(async (): Promise<Me | null> => {
  const secret = (await cookies()).get(COOKIES.session)?.value;
  if (!isSecret(secret)) return null;
  const sessionHash = hashSecret(secret);
  let row: SessionRow | null;
  try {
    row = await sessionGet(sessionHash);
  } catch (error) {
    // No database: the website still works, signed out.
    if (error instanceof CantReachError) return null;
    throw error;
  }
  if (!row) return null;
  const { phone, ...rest } = row;
  const name = row.displayName ?? row.alias ?? "You";
  return {
    ...rest,
    name,
    firstName: firstNameOf(name),
    initials: initialsOf(name),
    maskedPhone: maskedNumber(phone),
    sessionHash,
  };
});

/** Starts a website session in this browser. */
export async function setSessionCookie(secret: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIES.session, secret, cookieOptions(COOKIE_LIFE.session));
  jar.delete(COOKIES.signin);
}
