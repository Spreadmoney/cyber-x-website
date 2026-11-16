/**
 * Sign-in on the website (W2): the words people see and the small rules
 * around them, kept apart from the database so they can be tested alone.
 */

export const COOKIES = {
  /** The website's own session (W2.3). Never the app's. */
  session: "cx_web_session",
  /** One sign-in in progress in this browser. */
  signin: "cx_web_signin",
  /** "Your account is frozen": when, and from which browser (display only). */
  frozen: "cx_web_frozen",
} as const;

/** How long each cookie lives, in seconds. */
export const COOKIE_LIFE = {
  session: 2 * 60 * 60,
  signin: 15 * 60,
  frozen: 24 * 60 * 60,
} as const;

/** Where a finished sign-in may go: only our own pages, never another site. */
export const NEXT_PAGES = ["/account", "/freeze"] as const;
export type NextPage = (typeof NEXT_PAGES)[number];

export function safeNext(value: unknown): NextPage {
  return NEXT_PAGES.find((page) => page === value) ?? "/account";
}

export const MESSAGES = {
  who: "Enter your Cyber X ID, alias or phone number.",
  password: "Enter your password.",
  wrong: "That alias or password isn’t right. Check both and try again.",
  code: "Enter the 6-digit code.",
  wrongCode: (left: number) =>
    left <= 3
      ? `That code isn’t right. ${left} ${left === 1 ? "try" : "tries"} left.`
      : "That code isn’t right. Check it and try again.",
  expired: "That code has expired. Send a new one.",
  stopped: "Too many wrong codes. Start again.",
  limit: (when: string) => `No more codes for now. Try again ${when}.`,
  passkeyCancelled: "The passkey didn’t sign you in. Try again, or use your password.",
  passkeyUnsupported: "This browser can’t use your passkey here. Use your password or a code.",
  cantReach: "We can’t reach Cyber X right now. Try again in a few minutes.",
  frozen:
    "This account is frozen. To unfreeze it, sign in on a phone you trust and do a short video check with our team.",
  unavailable: "This account can’t be signed in to right now. Contact us and we’ll help.",
  gone: "That sign-in has timed out. Start again.",
} as const;

/** "at 14:52" today, or "on 17 Nov at 09:00", in the country's time. */
export function formatWhen(when: Date, now: Date, timeZone: string): string {
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(when);
  const day = (d: Date) =>
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone }).format(d);
  return day(when) === day(now) ? `at ${time}` : `on ${day(when)} at ${time}`;
}

/** "15 Nov 2026 at 09:41", for the Frozen page and Recent sign-ins. */
export function formatMoment(when: Date, timeZone: string): string {
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(when);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(when);
  return `${date}, ${time}`;
}

/** "Tier 2", or "Not verified yet" for tier 0. */
export function tierLabel(tier: number): string {
  return tier > 0 ? `Tier ${tier}` : "Not verified yet";
}

/** What the browser keeps about a freeze, for the Frozen page only. */
export interface FrozenNote {
  at: string;
  browser: string;
}

export function readFrozenNote(value: string | undefined): FrozenNote | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<FrozenNote>;
    if (typeof parsed.at !== "string" || Number.isNaN(Date.parse(parsed.at))) return null;
    if (typeof parsed.browser !== "string" || parsed.browser.length > 80) return null;
    return { at: parsed.at, browser: parsed.browser };
  } catch {
    return null;
  }
}
