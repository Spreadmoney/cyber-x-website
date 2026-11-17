import { readWho } from "@/lib/auth/identity";

/**
 * Rules shared by the website's forms (W7: Report a scam, Contact us,
 * Complaints, Careers). Built ahead of the app on 17 Nov 2026: until the
 * team's control room exists (app M16, M19), FORMS_LIVE is false and nothing
 * is sent; each form says so before and after.
 */
export const FORMS_LIVE = false;

export type Errors<K extends string> = Partial<Record<K, string>>;

/** A text field's value, trimmed, or "" for anything but text. */
export function text(value: FormDataEntryValue | null, longest: number): string {
  return typeof value === "string" ? value.trim().slice(0, longest + 1) : "";
}

/** Within limits: at least `shortest` characters, at most `longest`. */
export const fits = (value: string, shortest: number, longest: number): boolean =>
  value.length >= shortest && value.length <= longest;

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@.]{2,}$/;

/** An email address, or a phone number written any way the sign-in box accepts. */
export function isReplyAddress(value: string): boolean {
  if (EMAIL.test(value)) return true;
  return readWho(value)?.kind === "phone";
}

export const isEmail = (value: string): boolean => EMAIL.test(value);

/** A date as the date picker sends it (YYYY-MM-DD), not in the future. */
export function isPastDate(value: string, today: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const day = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== value) return false;
  return value <= today.toISOString().slice(0, 10) && value >= "2020-01-01";
}

const COUNT = ["No", "One", "Two", "Three", "Four", "Five", "Six"];

/** "Two things need fixing: choose what happened, and tell us a little about it." */
export function summary(fixes: readonly string[]): string {
  const n = fixes.length;
  const list = n <= 1 ? (fixes[0] ?? "") : `${fixes.slice(0, -1).join(", ")}, and ${fixes[n - 1]}`;
  return `${COUNT[n] ?? n} ${n === 1 ? "thing needs" : "things need"} fixing: ${list}.`;
}
