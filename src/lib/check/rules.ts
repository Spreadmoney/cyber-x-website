import { getCountryPack } from "@/config/countries";
import { formatMoney, parseMoney, type MinorUnits } from "@/lib/money";

/**
 * Check a payment (W4, built ahead on 17 Nov 2026 at Ayora's request: "build
 * the pages and then the features ... when the corresponding feature on the
 * app is done").
 *
 * CHECKS_LIVE stays false until the app can send payments (M6) and keep
 * their history (M14). Until then nothing is looked up: every check says
 * checks start soon, never that a receipt is fake, since no Cyber X payment
 * exists yet to match it against.
 */
export const CHECKS_LIVE = false;

/** What a receipt shows: letters, digits and dashes, like DX-7741-0912. */
const REFERENCE = /^[A-Z0-9](?:[A-Z0-9-]{4,22})[A-Z0-9]$/;

/** No single payment on a receipt is larger (₦100 million). */
const LARGEST: MinorUnits = 100_000_000_00;

export const CHECK_MESSAGES = {
  reference: "Enter the reference from the receipt, like DX-7741-0912.",
  amount: "Enter the amount from the receipt, like ₦25,000.00.",
} as const;

export interface CheckInput {
  reference: string;
  amount: MinorUnits;
}

export type CheckErrors = Partial<Record<keyof CheckInput, string>>;

/** The reference as receipts print it: capitals, no spaces. */
export function normaliseReference(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim().toUpperCase().replace(/\s+/g, "").slice(0, 40);
}

/** Reads the two fields, or says what to fix in each. */
export function readCheck(
  reference: unknown,
  amount: unknown,
): { ok: true; input: CheckInput } | { ok: false; errors: CheckErrors } {
  const errors: CheckErrors = {};
  const ref = normaliseReference(reference);
  if (!REFERENCE.test(ref) || !/\d/.test(ref)) errors.reference = CHECK_MESSAGES.reference;
  const currency = getCountryPack().currency;
  const minor =
    typeof amount === "string" && amount.length <= 32
      ? parseMoney(amount.replace(/\s+/g, ""), currency)
      : null;
  if (minor === null || minor <= 0 || minor > LARGEST) errors.amount = CHECK_MESSAGES.amount;
  if (errors.reference || errors.amount) return { ok: false, errors };
  return { ok: true, input: { reference: ref, amount: minor! } };
}

/** "₦25,000.00", as on the receipt. */
export function amountText(amount: MinorUnits): string {
  return formatMoney(amount, getCountryPack().currency);
}

/** What the Check a payment page shows (Figma Check a payment, Real, Not found). */
export type CheckState =
  | { step: "form"; errors?: CheckErrors; reference?: string; amount?: string }
  /** Until CHECKS_LIVE: nothing to check against yet. */
  | { step: "not_live"; reference: string; amount: string }
  | { step: "not_found"; reference: string; amount: string }
  | {
      step: "real";
      reference: string;
      amount: string;
      /** First name and initial only, never a full name or account number. */
      from: string;
      to: string;
      paidAt: string;
    };

/**
 * The Figma examples, for reviewing the states before the app can send
 * payments. Shown only where PAGE_PREVIEWS=on (never on the live site): a
 * "real" result anyone could open would be a gift to fake-receipt scams.
 */
export const PREVIEWS: Record<"real" | "not_found" | "not_live", CheckState> = {
  real: {
    step: "real",
    reference: "DX-7741-0912",
    amount: "₦25,000.00",
    from: "Maryam B.",
    to: "Ayora O.",
    paidAt: "15 Nov 2026, 08:12",
  },
  not_found: { step: "not_found", reference: "DX-7741-0921", amount: "₦25,000.00" },
  not_live: { step: "not_live", reference: "DX-7741-0912", amount: "₦25,000.00" },
};

export function previewOf(asked: unknown, previews: string | undefined): CheckState | null {
  if (previews !== "on" || typeof asked !== "string") return null;
  return Object.hasOwn(PREVIEWS, asked) ? PREVIEWS[asked as keyof typeof PREVIEWS] : null;
}
