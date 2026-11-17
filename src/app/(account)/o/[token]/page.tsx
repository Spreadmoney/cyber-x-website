import type { Metadata } from "next";

import { RequestPage } from "@/components/requests/RequestView";
import { SafelyScreen } from "@/components/safely/SafelyScreens";
import { readQuery } from "@/lib/content/query";
import { readAddresses } from "@/lib/env/addresses";
import { EXAMPLE, ORDER_SCREENS, reviewLink, safelyPreview } from "@/lib/safely/rules";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * W6 (Figma Open your order … Report received): the buyer's order, opened
 * from the texted link. Until the app has Pay me safely, no order link is
 * real; ?preview=<screen> shows the Figma example, only where PAGE_PREVIEWS=on.
 */
export default async function OrderPage({ searchParams }: Props) {
  const asked = readQuery((await searchParams).preview);
  const screen = safelyPreview(ORDER_SCREENS, asked, process.env.PAGE_PREVIEWS);
  const { appUrl } = readAddresses();
  if (!screen) return <RequestPage view={{ state: "not_real" }} appUrl={appUrl} />;
  return <SafelyScreen screen={screen} order={EXAMPLE} to={reviewLink} appUrl={appUrl} />;
}
