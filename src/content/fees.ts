/**
 * Cyber X fees, as Ayora set them on 15 Nov 2026: "Use what CBN approves."
 * Transfers follow the CBN Guide to Charges by Banks and Other Financial
 * Institutions, 2026 (circular of 21 April 2026, in force from 1 May 2026).
 *
 * Amounts are in kobo (₦1 = 100 kobo), like the app's money rules.
 * When the app's country pack gains fee bands, these move there and are
 * copied here by the shared-parts sync.
 */
export const FEES_UPDATED = "15 November 2026";

const naira = (amount: number) => amount * 100;

/** The CBN's transfer bands: free up to ₦5,000, ₦10 up to ₦50,000, ₦50 above. */
export function transferFee(amount: number): number {
  if (amount <= naira(5_000)) return 0;
  if (amount <= naira(50_000)) return naira(10);
  return naira(50);
}

export const SERVICES = {
  send: { label: "Pay someone on Cyber X", fee: transferFee },
  withdraw: { label: "Withdraw to a bank", fee: transferFee },
  addTransfer: { label: "Add money by bank transfer", fee: () => 0 },
  addCard: { label: "Add money by card", fee: (amount: number) => Math.round(amount * 0.005) },
  bill: { label: "Pay a bill", fee: () => naira(50) },
  airtime: { label: "Buy airtime or data", fee: () => 0 },
} as const satisfies Record<string, { label: string; fee: (amount: number) => number }>;

export type Service = keyof typeof SERVICES;

export function isService(value: string): value is Service {
  return Object.hasOwn(SERVICES, value);
}

/** The fee and the total for an amount, all in kobo. */
export function feeFor(service: Service, amount: number): { fee: number; total: number } {
  if (!Number.isInteger(amount) || amount < 0)
    throw new RangeError("The amount must be whole kobo, 0 or more.");
  const fee = SERVICES[service].fee(amount);
  return { fee, total: amount + fee };
}

export const TRANSFER_BAND = "Free up to ₦5,000 · ₦10 up to ₦50,000 · ₦50 above";
