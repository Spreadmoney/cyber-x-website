import type { Metadata } from "next";

import { RequestPage } from "@/components/requests/RequestView";
import { readQuery } from "@/lib/content/query";
import { readAddresses } from "@/lib/env/addresses";
import { readRequest, requestPreview } from "@/lib/requests/rules";

export const metadata: Metadata = {
  title: "Payment request",
  // A request link is for the person it was sent to.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * W5 (Figma Payment request link). ?preview=open|paid|expired|cancelled|
 * not_real shows a state with the Figma example, only where PAGE_PREVIEWS=on.
 */
export default async function RequestLinkPage({ params, searchParams }: Props) {
  const [{ code }, query] = await Promise.all([params, searchParams]);
  const view =
    requestPreview(readQuery(query.preview), process.env.PAGE_PREVIEWS) ??
    (await readRequest(code));
  return <RequestPage view={view} appUrl={readAddresses().appUrl} />;
}
