// Copied from Codebase (src/lib/money.ts) by `npm run sync:shared`. Change it there, then sync. Never edit it here.

/**
 * Money in Cyber X.
 *
 * Every amount is a whole number of minor units (kobo for naira) held in an
 * integer. Amounts are never stored, added or compared as decimals, so a
 * balance can never drift by a fraction of a kobo.
 *
 * Nothing here knows about naira: the currency comes from the country pack
 * (see src/config/countries), which keeps the core country-neutral.
 */

export interface Currency {
  /** ISO 4217 code, for example "NGN". */
  readonly code: string;
  /** Symbol shown to people, for example "₦". */
  readonly symbol: string;
  /** Digits after the decimal mark: 2 for naira and kobo. */
  readonly decimals: number;
  /** Thousands separator, for example ",". */
  readonly groupSeparator: string;
  /** Decimal mark, for example ".". */
  readonly decimalSeparator: string;
}

/** A whole number of minor units. ₦1.00 is 100. */
export type MinorUnits = number;

export type SignDisplay = "negative" | "always" | "never";

export interface FormatMoneyOptions {
  /**
   * "negative" (default) marks only amounts below zero: "− ₦15,000.00".
   * "always" also marks money in: "+ ₦25,000.00".
   * "never" shows the bare amount.
   */
  readonly sign?: SignDisplay;
}

/** A real minus sign, not a hyphen, as in the designs. */
const MINUS = "−";

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

/** Throws unless the value is a whole, safe number of minor units. */
export function assertMinorUnits(value: unknown, label = "amount"): asserts value is MinorUnits {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new MoneyError(`The ${label} must be a whole number of minor units.`);
  }
}

function minorPerMajor(currency: Currency): number {
  return 10 ** currency.decimals;
}

function groupThousands(digits: string, separator: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/**
 * Formats minor units for display, always with every decimal place:
 * 125000000 becomes "₦1,250,000.00".
 */
export function formatMoney(
  amount: MinorUnits,
  currency: Currency,
  options: FormatMoneyOptions = {},
): string {
  assertMinorUnits(amount);
  const sign = options.sign ?? "negative";
  const per = minorPerMajor(currency);
  const absolute = Math.abs(amount);
  const major = Math.trunc(absolute / per);
  const minor = absolute % per;

  let text = currency.symbol + groupThousands(String(major), currency.groupSeparator);
  if (currency.decimals > 0) {
    text += currency.decimalSeparator + String(minor).padStart(currency.decimals, "0");
  }

  if (sign === "never" || amount === 0) return text;
  if (amount < 0) return `${MINUS} ${text}`;
  return sign === "always" ? `+ ${text}` : text;
}

/**
 * Reads an amount a person typed, such as "1,250,000.50" or "5000", and
 * returns minor units. Returns null when the text is not a valid amount, so
 * the screen can show an error and keep its button disabled.
 *
 * Refused on purpose: negative amounts, more decimal places than the
 * currency has, letters, and anything too large to hold exactly.
 */
export function parseMoney(input: string, currency: Currency): MinorUnits | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;

  const withoutSymbol = trimmed.startsWith(currency.symbol)
    ? trimmed.slice(currency.symbol.length).trim()
    : trimmed;

  const [whole = "", fraction, ...rest] = withoutSymbol.split(currency.decimalSeparator);
  if (rest.length > 0) return null;

  const wholeDigits = whole.split(currency.groupSeparator).join("");
  if (!/^\d+$/.test(wholeDigits)) return null;

  // A grouped number must be grouped correctly: "1,250" yes, "12,50" no.
  if (whole.includes(currency.groupSeparator)) {
    const groups = whole.split(currency.groupSeparator);
    const [first = "", ...others] = groups;
    const firstOk = first.length >= 1 && first.length <= 3;
    if (!firstOk || others.some((group) => group.length !== 3)) return null;
  }

  let fractionDigits = "";
  if (fraction !== undefined) {
    if (currency.decimals === 0) return null;
    if (!/^\d+$/.test(fraction) || fraction.length > currency.decimals) return null;
    fractionDigits = fraction;
  }

  const minorText = wholeDigits + fractionDigits.padEnd(currency.decimals, "0");
  const value = Number(minorText);
  if (!Number.isSafeInteger(value)) return null;
  return value;
}

/** Adds amounts, refusing anything that is not exact. */
export function addMoney(...amounts: MinorUnits[]): MinorUnits {
  let total = 0;
  for (const amount of amounts) {
    assertMinorUnits(amount);
    total += amount;
    assertMinorUnits(total, "total");
  }
  return total;
}

/** Subtracts one amount from another, refusing anything that is not exact. */
export function subtractMoney(from: MinorUnits, amount: MinorUnits): MinorUnits {
  assertMinorUnits(from);
  assertMinorUnits(amount);
  const result = from - amount;
  assertMinorUnits(result, "result");
  return result;
}
