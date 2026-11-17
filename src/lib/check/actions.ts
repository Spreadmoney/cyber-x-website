"use server";

import { amountText, readCheck, type CheckState } from "./rules";

/**
 * Check a payment (W4.2). Until the app can send payments (M6, M14) every
 * check says checks start soon. W4.1 adds the database look-up and W4.3 the
 * per-visitor limit and bot check, when CHECKS_LIVE turns on.
 */
export async function checkPayment(_previous: CheckState, form: FormData): Promise<CheckState> {
  const reference = form.get("reference");
  const amount = form.get("amount");
  const read = readCheck(reference, amount);
  if (!read.ok) {
    return {
      step: "form",
      errors: read.errors,
      reference: typeof reference === "string" ? reference.slice(0, 40) : "",
      amount: typeof amount === "string" ? amount.slice(0, 32) : "",
    };
  }
  // Nothing to look up yet (CHECKS_LIVE is false): W4.1 replaces this line
  // with the look-up, which answers "real" or "not_found".
  return {
    step: "not_live",
    reference: read.input.reference,
    amount: amountText(read.input.amount),
  };
}
