/**
 * Which phone a visitor is on, from the browser's own description of itself
 * (the User-Agent). Get the app leads with the right store: App Store on an
 * iPhone, Google Play on Android. Anything else (a laptop) sees both.
 *
 * This only chooses the order of two buttons and a few words, so a browser
 * that describes itself wrongly loses nothing.
 */
export type Platform = "ios" | "android" | "other";

export function platformFrom(userAgent: string | null | undefined): Platform {
  if (!userAgent) return "other";
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  return "other";
}
