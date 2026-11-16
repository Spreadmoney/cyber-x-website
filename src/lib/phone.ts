// Copied from Codebase (src/lib/phone.ts) by `npm run sync:shared`. Change it there, then sync. Never edit it here.

import type { PhoneFormat } from "@/config/countries";

/**
 * Phone numbers, for signing up and account security only.
 *
 * Rule 9: Cyber X never pays by phone number. A phone number proves who
 * owns an account; it is never a way to find someone to pay.
 *
 * The app keeps the "national number": the digits after the dialling code,
 * without the leading 0 (801 234 5678 in Nigeria, written 0801 234 5678 at
 * home and +234 801 234 5678 abroad). People type it every way, so every way
 * is accepted.
 */

export interface ParsedPhoneInput {
  /** Digits after the dialling code, never more than the country allows. */
  readonly digits: string;
  /** How many digits were dropped from the front (a 0, or the dialling code). */
  readonly droppedFromFront: number;
}

/**
 * Turns whatever was typed or pasted into the national number:
 * "0801 234 5678", "+234 801 234 5678", "00234…", "234801…" and "801-234-5678"
 * all become "8012345678".
 */
export function parsePhoneInput(input: string, format: PhoneFormat): ParsedPhoneInput {
  const all = input.replace(/\D/g, "");
  const dial = format.dialCode.replace(/\D/g, "");
  const trimmed = input.trimStart();
  let start = 0;

  if (trimmed.startsWith("+") && all.startsWith(dial)) {
    start = dial.length;
  } else if (trimmed.startsWith("00") && all.startsWith(`00${dial}`)) {
    start = dial.length + 2;
  } else if (all.startsWith(dial) && all.length > format.nationalNumberLength) {
    // Pasted with the dialling code but no plus sign: 2348012345678.
    start = dial.length;
  }

  // The 0 people dial at home is not part of the number.
  while (all[start] === "0") {
    start += 1;
  }

  return {
    digits: all.slice(start, start + format.nationalNumberLength),
    droppedFromFront: start,
  };
}

export function toNationalNumber(input: string, format: PhoneFormat): string {
  return parsePhoneInput(input, format).digits;
}

/** Spaces the number for reading: 8012345678 → "801 234 5678". Works on part numbers too. */
export function formatNationalNumber(digits: string, format: PhoneFormat): string {
  const parts: string[] = [];
  let position = 0;
  for (const size of format.groups) {
    if (position >= digits.length) break;
    parts.push(digits.slice(position, position + size));
    position += size;
  }
  return parts.join(" ");
}

/** True when the number is the full length and starts like a mobile number. */
export function isCompletePhoneNumber(digits: string, format: PhoneFormat): boolean {
  return (
    /^\d+$/.test(digits) &&
    digits.length === format.nationalNumberLength &&
    format.mobilePrefixes.some((prefix) => digits.startsWith(prefix))
  );
}

/**
 * The error to show under the field, or null. A number still being typed is
 * not an error; a number that can't become a mobile number is, as soon as
 * that is clear (one wrong digit is enough), so nobody types eleven digits to
 * find out.
 */
export function phoneNumberError(
  digits: string,
  format: PhoneFormat,
  countryName: string,
): string | null {
  if (digits.length === 0) return null;
  const couldBeMobile = format.mobilePrefixes.some((prefix) =>
    digits.length >= prefix.length ? digits.startsWith(prefix) : prefix.startsWith(digits),
  );
  return couldBeMobile ? null : `This isn’t a mobile number in ${countryName}.`;
}

/** The international form the server stores: "+2348012345678". */
export function toInternationalNumber(digits: string, format: PhoneFormat): string {
  if (!isCompletePhoneNumber(digits, format)) {
    throw new Error("The phone number is not complete.");
  }
  return `${format.dialCode}${digits}`;
}

/**
 * The number with its middle hidden, for screens that remind someone which
 * number a code went to without showing it to a passer-by:
 * 8012345678 → "+234 801 •••• 678".
 */
export function maskPhoneNumber(digits: string, format: PhoneFormat): string {
  const first = digits.slice(0, format.groups[0] ?? 3);
  return `${format.dialCode} ${first} •••• ${digits.slice(-3)}`;
}

/** The national digits of a stored international number, or null if it isn't this country's. */
export function fromInternationalNumber(phone: string, format: PhoneFormat): string | null {
  if (!phone.startsWith(format.dialCode)) return null;
  const digits = phone.slice(format.dialCode.length);
  return isCompletePhoneNumber(digits, format) ? digits : null;
}

/**
 * Where the text cursor belongs after the number is re-spaced: just after the
 * same number of digits as before, so typing in the middle doesn't throw the
 * cursor to the end.
 */
export function caretAfterDigits(formatted: string, digitCount: number): number {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    if (/\d/.test(formatted[index]!)) {
      seen += 1;
      if (seen === digitCount) return index + 1;
    }
  }
  return formatted.length;
}
