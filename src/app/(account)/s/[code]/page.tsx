import type { Metadata } from "next";

import { RequestPage } from "@/components/requests/RequestView";
import { SafelyScreen } from "@/components/safely/SafelyScreens";
import { readQuery } from "@/lib/content/query";
import { readAddresses } from "@/lib/env/addresses";
import { EXAMPLE, LINK_SCREENS, reviewLink, safelyPreview } from "@/lib/safely/rules";

export const metadata: Metadata = {
  title: "Pay me safely",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * W6 (Figma Pay me safely link, Pay by card, Payment held). Until the app
 * has Pay me safely (M9, M10), no link is real; ?preview=<screen> shows the
 * Figma example, only where PAGE_PREVIEWS=on.
 */
export default async function PayMeSafelyLinkPage({ searchParams }: Props) {
  const asked = readQuery((await searchParams).preview);
  const screen = safelyPreview(LINK_SCREENS, asked, process.env.PAGE_PREVIEWS);
  const { appUrl } = readAddresses();
  if (!screen) return <RequestPage view={{ state: "not_real" }} appUrl={appUrl} />;
  return <SafelyScreen screen={screen} order={EXAMPLE} to={reviewLink} appUrl={appUrl} />;
}
