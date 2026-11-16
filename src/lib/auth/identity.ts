import { getCountryPack } from "@/config/countries";
import { isValidAlias, normalizeAlias } from "@/lib/alias";
import {
  fromInternationalNumber,
  isCompletePhoneNumber,
  maskPhoneNumber,
  parsePhoneInput,
  toInternationalNumber,
} from "@/lib/phone";

/** What someone typed to say who they are: a Cyber X ID, an alias or a number. */
export interface Who {
  kind: "id" | "alias" | "phone";
  /** As the database stores it: CX-…, the alias without "@", or +234…. */
  value: string;
}

const CYBERX_ID = /^cx[\s-]?([0-9a-z]{4})[\s-]?([0-9a-z]{4})[\s-]?([0-9a-z]{4})$/i;
const LOOKS_LIKE_NUMBER = /^[+\d][\d\s().-]*$/;

/** Reads what was typed, or null when it can't be any of the three. */
export function readWho(input: string): Who | null {
  const text = (input ?? "").trim();
  if (!text) return null;
  const id = CYBERX_ID.exec(text);
  if (id) return { kind: "id", value: `CX-${id[1]}-${id[2]}-${id[3]}`.toUpperCase() };
  if (LOOKS_LIKE_NUMBER.test(text) && /\d/.test(text)) {
    const format = getCountryPack().phone;
    const { digits } = parsePhoneInput(text, format);
    return isCompletePhoneNumber(digits, format)
      ? { kind: "phone", value: toInternationalNumber(digits, format) }
      : null;
  }
  const alias = normalizeAlias(text);
  return isValidAlias(alias) ? { kind: "alias", value: alias } : null;
}

/** +2348012345678 → "+234 801 •••• 678" (never the whole number on a screen). */
export function maskedNumber(international: string | null | undefined): string | null {
  if (!international) return null;
  const format = getCountryPack().phone;
  const digits = fromInternationalNumber(international, format);
  return digits ? maskPhoneNumber(digits, format) : null;
}

/** "Ayora Okafor" → "AO"; "Ayora" → "A". */
export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0]!, parts.at(-1)!] : parts.slice(0, 1);
  return letters.map((part) => part[0]!.toUpperCase()).join("") || "CX";
}

export function firstNameOf(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] || "You";
}

/** "Chrome on Mac", from the browser's User-Agent, for "Where you're signed in". */
export function browserLabel(userAgent: string | null | undefined): string {
  const ua = userAgent ?? "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /SamsungBrowser\//.test(ua)
      ? "Samsung Internet"
      : /OPR\//.test(ua)
        ? "Opera"
        : /Firefox\/|FxiOS\//.test(ua)
          ? "Firefox"
          : /Chrome\/|CriOS\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : null;
  const device = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X|Macintosh/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux/.test(ua)
              ? "Linux"
              : null;
  if (browser && device) return `${browser} on ${device}`;
  return browser ?? (device ? `A browser on ${device}` : "A browser");
}
