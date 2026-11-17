/**
 * Pay me safely links (W6, built ahead on 17 Nov 2026). A seller shares
 * WEBSITE_URL/s/<code>; a buyer without the app pays by card through the
 * payment partner (Paystack), and follows the order at WEBSITE_URL/o/<token>,
 * the link texted to them. Only the app moves money: the website asks it to
 * open a held order and never holds the payment partner's secret key.
 *
 * SAFELY_LIVE stays false until the app has Pay me safely (M9) and the test
 * card (M10). Until then no link is real, so every code shows "This isn't
 * a real Cyber X link". The 12 buyer screens can be reviewed, and clicked
 * through, where PAGE_PREVIEWS=on (never on the live site).
 */
export const SAFELY_LIVE = false;

/** The seller's link: the buyer pays here. */
export const LINK_SCREENS = ["link", "pay_by_card", "held"] as const;
/** The buyer's order, opened from the texted link. */
export const ORDER_SCREENS = [
  "open_order",
  "waiting",
  "cancel",
  "cancelled",
  "sent",
  "did_it_arrive",
  "paid",
  "whats_wrong",
  "report_received",
] as const;

export type LinkScreen = (typeof LINK_SCREENS)[number];
export type OrderScreen = (typeof ORDER_SCREENS)[number];
export type Screen = LinkScreen | OrderScreen;

/** The Figma example order (Kemi sells Ankara fabric to Bisi). */
export const EXAMPLE = {
  code: "kemi7Q2mX9",
  token: "b1s1Ord3rT0k3n",
  seller: {
    name: "Kemi Adebayo",
    first: "Kemi",
    alias: "kemi.fabrics",
    since: "March 2026",
    sales: 31,
  },
  item: "Ankara fabric, 6 yards",
  amount: "₦18,500.00",
  sendWithinDays: 3,
  sendBy: "18 Nov",
  autoPayBy: "20 Nov",
  buyer: {
    name: "Bisi Adewale",
    first: "Bisi",
    phone: "0812 345 6789",
    masked: "0812\u00a0•••\u00a06789",
  },
  paidAt: "15 Nov, 10:05",
  sentAt: "16 Nov, 14:10 · by dispatch rider",
  sellerNote: "Sent today. It should reach you tomorrow.",
  reference: "CX-2W8N-1511",
  reportReference: "RX-3K9P-1611",
} as const;

export type Order = typeof EXAMPLE;

/** Which screen to show for review, or null (always null on the live site). */
export function safelyPreview<S extends string>(
  screens: readonly S[],
  asked: unknown,
  previews: string | undefined,
): S | null {
  if (previews !== "on" || typeof asked !== "string") return null;
  return (screens as readonly string[]).includes(asked) ? (asked as S) : null;
}

/** Where a review screen lives: the seller's link (/s/…) or the buyer's order (/o/…). */
export const reviewLink = (screen: Screen): string =>
  (LINK_SCREENS as readonly string[]).includes(screen)
    ? `/s/${EXAMPLE.code}?preview=${screen}`
    : `/o/${EXAMPLE.token}?preview=${screen}`;
