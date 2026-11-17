/**
 * Payment request links (W5, built ahead on 17 Nov 2026). A request made in
 * the app (M7) is shared as WEBSITE_URL/r/<code>. The page shows who is
 * asking and the request's state, never the amount or what it's for: links
 * get forwarded.
 *
 * REQUESTS_LIVE stays false until the app can make requests (M7). Until
 * then no link is real, so every code shows "This isn't a real Cyber X
 * link", which is the truth.
 */
export const REQUESTS_LIVE = false;

/** A link's code: 8 to 16 letters and digits. Anything else isn't a link of ours. */
const CODE = /^[A-Za-z0-9]{8,16}$/;

export function isRequestCode(code: unknown): code is string {
  return typeof code === "string" && CODE.test(code);
}

export interface Requester {
  name: string;
  alias: string;
}

export type RequestView =
  | {
      state: "open" | "paid" | "expired" | "cancelled";
      code: string;
      from: Requester;
      sentTo: string;
    }
  | { state: "not_real" };

/** First name, for "Chidi sent you a request." */
export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? name;

/** "CE" for Chidi Eze. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words.at(-1)?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * Where "Open in the Cyber X app" goes. The app's request screen (M7) must
 * answer at APP_URL/r/<code>, so one code works on both.
 */
export const appRequestUrl = (appUrl: string, code: string): string =>
  `${appUrl}/r/${encodeURIComponent(code)}`;

const EXAMPLE = {
  code: "k7Q2mX9pLw",
  from: { name: "Chidi Eze", alias: "chidi.eze" },
  sentTo: "ayora",
};

/** The Figma examples, shown only where PAGE_PREVIEWS=on (never on the live site). */
export const REQUEST_PREVIEWS: Record<RequestView["state"], RequestView> = {
  open: { state: "open", ...EXAMPLE },
  paid: { state: "paid", ...EXAMPLE },
  expired: { state: "expired", ...EXAMPLE },
  cancelled: { state: "cancelled", ...EXAMPLE },
  not_real: { state: "not_real" },
};

export function requestPreview(asked: unknown, previews: string | undefined): RequestView | null {
  if (previews !== "on" || typeof asked !== "string") return null;
  return Object.hasOwn(REQUEST_PREVIEWS, asked)
    ? REQUEST_PREVIEWS[asked as RequestView["state"]]
    : null;
}

/**
 * Reads a link. Until the app makes requests (REQUESTS_LIVE), none is real.
 * W5.1 adds the look-up (a web function, after isRequestCode) with app M7.
 */
export async function readRequest(code: unknown): Promise<RequestView> {
  void code;
  return { state: "not_real" };
}
