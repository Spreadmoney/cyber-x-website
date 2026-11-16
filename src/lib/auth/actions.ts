"use server";

import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { verify } from "@node-rs/argon2";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";

import { getCountryPack } from "@/config/countries";
import { CantReachError } from "@/lib/db";
import { readAddresses } from "@/lib/env/addresses";

import { browserLabel, maskedNumber, readWho } from "./identity";
import { COOKIES, COOKIE_LIFE, MESSAGES, formatWhen, safeNext, type FrozenNote } from "./rules";
import { cookieOptions, getMe, setSessionCookie } from "./session";
import {
  DECOY_HASH,
  codeHash,
  hashSecret,
  isSecret,
  newCode,
  newSecret,
  visitorHash,
} from "./secrets";
import { deliverCode } from "./sms";
import * as store from "./store";

/** Where a sign-in on the website has got to (W2.1). */
export type SignInState =
  | { step: "details"; error?: string }
  | {
      step: "code";
      /**
       * "+234 801 •••• 678", or null for "the number on your account".
       * Missing (with the timings) when only an error comes back: the screen
       * keeps what it showed.
       */
      number?: string | null;
      /** Test mode only: the code, shown on the screen. */
      testCode?: string;
      expiresInMs?: number;
      resendInMs?: number;
      error?: string;
    }
  | { step: "paused"; untilMs: number }
  | { step: "stopped"; message: string };

async function visitor(): Promise<{ hash: Buffer; browser: string }> {
  const list = await headers();
  const address =
    list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip") || "local";
  return { hash: visitorHash(address), browser: browserLabel(list.get("user-agent")) };
}

/** The sign-in in progress in this browser, or a new one. */
async function signinSecret(fresh: boolean): Promise<string | null> {
  const jar = await cookies();
  if (fresh) {
    const secret = newSecret();
    jar.set(COOKIES.signin, secret, cookieOptions(COOKIE_LIFE.signin));
    return secret;
  }
  const secret = jar.get(COOKIES.signin)?.value;
  return isSecret(secret) ? secret : null;
}

const paused = (until: Date | null): SignInState => ({
  step: "paused",
  untilMs: Math.max(0, (until?.getTime() ?? Date.now()) - Date.now()),
});

const when = (at: Date | null) =>
  formatWhen(at ?? new Date(), new Date(), getCountryPack().timeZone);

function stopped(outcome: string): SignInState | null {
  if (outcome === "frozen") return { step: "stopped", message: MESSAGES.frozen };
  if (outcome === "unavailable") return { step: "stopped", message: MESSAGES.unavailable };
  if (outcome === "gone") return { step: "details", error: MESSAGES.gone };
  return null;
}

/** Sends a code for this sign-in and says what the code screen shows. */
async function sendTheCode(secret: string, error?: string): Promise<SignInState> {
  const code = newCode();
  const sent = await store.sendCode(hashSecret(secret), codeHash(secret, code));
  if (sent.status === "gone") return { step: "details", error: MESSAGES.gone };
  if (sent.status === "limit")
    return { step: "stopped", message: MESSAGES.limit(when(sent.retryAt)) };
  const now = Date.now();
  if (sent.status === "too_soon") {
    return {
      step: "code",
      resendInMs: Math.max(0, (sent.resendAt?.getTime() ?? now) - now),
      error,
    };
  }
  // Nothing matched what was typed: nothing is sent, and the screen can't tell.
  const delivery = sent.deliver && sent.phone ? await deliverCode(sent.phone, code) : {};
  return {
    step: "code",
    number: sent.shownPhone ? maskedNumber(sent.phone) : null,
    testCode: delivery.showOnScreen,
    expiresInMs: (sent.expiresAt?.getTime() ?? now) - now,
    resendInMs: (sent.resendAt?.getTime() ?? now) - now,
    error,
  };
}

async function guarded(work: () => Promise<SignInState>): Promise<SignInState> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof CantReachError) return { step: "details", error: MESSAGES.cantReach };
    throw error;
  }
}

/** "Continue": the password, then a code (Figma Sign in → Check it's you). */
export async function signInWithPassword(whoText: string, password: string): Promise<SignInState> {
  const who = readWho(whoText);
  if (!who) return { step: "details", error: MESSAGES.who };
  if (typeof password !== "string" || !password)
    return { step: "details", error: MESSAGES.password };
  return guarded(async () => {
    const secret = (await signinSecret(true))!;
    const me = await visitor();
    const started = await store.startSignin(hashSecret(secret), me.hash, who, "password");
    if (started.pausedUntil) return paused(started.pausedUntil);
    if (started.lockedUntil) return paused(started.lockedUntil);
    // Compared on this server, against a decoy when nothing matched.
    let correct = false;
    try {
      correct = await verify(started.passwordHash ?? DECOY_HASH, password.slice(0, 256));
    } catch {
      correct = false;
    }
    const result = await store.passwordResult(
      hashSecret(secret),
      correct && Boolean(started.passwordHash),
    );
    if (result.outcome === "locked" || result.outcome === "paused") return paused(result.until);
    if (result.outcome === "wrong") return { step: "details", error: MESSAGES.wrong };
    return stopped(result.outcome) ?? sendTheCode(secret);
  });
}

/** "Get a code by text". */
export async function signInWithCode(whoText: string): Promise<SignInState> {
  const who = readWho(whoText);
  if (!who) return { step: "details", error: MESSAGES.who };
  return guarded(async () => {
    const secret = (await signinSecret(true))!;
    const started = await store.startSignin(
      hashSecret(secret),
      (await visitor()).hash,
      who,
      "code",
    );
    if (started.pausedUntil) return paused(started.pausedUntil);
    if (started.lockedUntil) return paused(started.lockedUntil);
    return sendTheCode(secret);
  });
}

/** "Resend code". */
export async function resendSignInCode(): Promise<SignInState> {
  return guarded(async () => {
    const secret = await signinSecret(false);
    if (!secret) return { step: "details", error: MESSAGES.gone };
    return sendTheCode(secret);
  });
}

/** "Continue" on Check it's you. Signed in: on to the next page. */
export async function confirmSignInCode(next: string, code: string): Promise<SignInState> {
  const secret = await signinSecret(false);
  if (!secret) return { step: "details", error: MESSAGES.gone };
  const digits = typeof code === "string" ? code.replace(/\D/g, "") : "";
  const session = newSecret();
  const result = await guarded(async () => {
    const verdict = await store.verifyCode(
      hashSecret(secret),
      codeHash(secret, /^\d{6}$/.test(digits) ? digits : "------"),
      hashSecret(session),
      (await visitor()).browser,
    );
    if (verdict.outcome === "signed_in") return { step: "details" } as SignInState;
    if (verdict.outcome === "paused") return paused(verdict.until);
    if (verdict.outcome === "stopped") return { step: "stopped", message: MESSAGES.stopped };
    const halt = stopped(verdict.outcome);
    if (halt) return halt;
    const error =
      verdict.outcome === "expired" ? MESSAGES.expired : MESSAGES.wrongCode(verdict.triesLeft ?? 0);
    return { step: "code", error };
  });
  if (result.step === "details" && !result.error) {
    await setSessionCookie(session);
    redirect(safeNext(next));
  }
  return result;
}

/** "Use a passkey instead": the request for the passkey made in the app (W2.2). */
export async function passkeyOptions(): Promise<
  { options: PublicKeyCredentialRequestOptionsJSON } | { error: string } | { pausedMs: number }
> {
  try {
    const { appUrl } = readAddresses();
    const secret = (await signinSecret(true))!;
    const challenge = new Uint8Array(randomBytes(32));
    const options = await generateAuthenticationOptions({
      rpID: new URL(appUrl).hostname,
      challenge,
      // Any passkey made in the app: the person picks theirs.
      allowCredentials: [],
      userVerification: "required",
      timeout: 60_000,
    });
    const until = await store.passkeyStart(
      hashSecret(secret),
      (await visitor()).hash,
      options.challenge,
    );
    if (until) return { pausedMs: Math.max(0, until.getTime() - Date.now()) };
    return { options };
  } catch (error) {
    if (error instanceof CantReachError) return { error: MESSAGES.cantReach };
    throw error;
  }
}

/** The passkey's answer, checked here; signed in, on to the next page. */
export async function passkeyFinish(
  next: string,
  response: AuthenticationResponseJSON,
): Promise<{ error: string } | { pausedMs: number }> {
  const secret = await signinSecret(false);
  // A passkey's ID is at most 1,023 bytes: about 1,400 characters written out.
  if (!secret || !response || typeof response.id !== "string" || response.id.length > 1400) {
    return { error: MESSAGES.gone };
  }
  const session = newSecret();
  try {
    const { appUrl, websiteUrl } = readAddresses();
    const token = hashSecret(secret);
    const key = await store.passkeyKey(token, response.id);
    let verified = false;
    let newCount: number | null = null;
    if (key) {
      try {
        const check = await verifyAuthenticationResponse({
          response,
          expectedChallenge: key.challenge,
          expectedOrigin: websiteUrl,
          expectedRPID: new URL(appUrl).hostname,
          credential: { id: response.id, publicKey: key.publicKey, counter: key.signCount },
          requireUserVerification: true,
        });
        verified = check.verified;
        newCount = check.authenticationInfo.newCounter;
      } catch {
        verified = false;
      }
    }
    const result = await store.passkeyResult({
      token,
      credentialId: response.id,
      verified,
      newCount,
      session: hashSecret(session),
      browser: (await visitor()).browser,
    });
    if (result.outcome === "paused") {
      return { pausedMs: Math.max(0, (result.until?.getTime() ?? Date.now()) - Date.now()) };
    }
    if (result.outcome === "frozen") return { error: MESSAGES.frozen };
    if (result.outcome === "unavailable") return { error: MESSAGES.unavailable };
    if (result.outcome !== "signed_in") return { error: MESSAGES.passkeyCancelled };
  } catch (error) {
    if (error instanceof CantReachError) return { error: MESSAGES.cantReach };
    throw error;
  }
  await setSessionCookie(session);
  redirect(safeNext(next));
}

/** "Sign out" (the website only; the app stays signed in). */
export async function signOut(): Promise<void> {
  const jar = await cookies();
  const secret = jar.get(COOKIES.session)?.value;
  if (isSecret(secret)) {
    try {
      await store.sessionEnd(hashSecret(secret));
    } catch (error) {
      if (!(error instanceof CantReachError)) throw error;
    }
  }
  jar.delete(COOKIES.session);
  redirect("/");
}

/** Your account → "Sign out" on a phone: the app signs out there (W2.4). */
export async function signOutPhone(formData: FormData): Promise<void> {
  const me = await getMe();
  const id = formData.get("phone");
  if (!me) redirect("/sign-in?next=/account");
  if (typeof id === "string" && /^[0-9a-f-]{36}$/.test(id)) {
    await store.signOutPhone(me.sessionHash, id);
  }
  revalidatePath("/account");
}

/** "Freeze my account" on Confirm (W2.5). */
export async function freezeMyAccount(): Promise<void> {
  const me = await getMe();
  if (!me) redirect("/freeze");
  const at = await store.freezeAccount(me.sessionHash);
  const jar = await cookies();
  jar.delete(COOKIES.session);
  if (at) {
    const note: FrozenNote = { at: at.toISOString(), browser: me.browser };
    jar.set(COOKIES.frozen, JSON.stringify(note), cookieOptions(COOKIE_LIFE.frozen));
  }
  redirect("/freeze/frozen");
}
