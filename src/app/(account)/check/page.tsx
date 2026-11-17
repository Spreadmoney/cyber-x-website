import type { Metadata } from "next";

import { CheckFlow } from "@/components/check/CheckFlow";
import { CHECKS_LIVE, previewOf } from "@/lib/check/rules";
import { readQuery } from "@/lib/content/query";

export const metadata: Metadata = {
  title: "Check a payment",
  description: "Got a receipt or a payment alert? Check it’s real before you hand anything over.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * W4 (Figma Check a payment). ?preview=real|not_found|not_live shows a
 * state with the Figma example, only where PAGE_PREVIEWS=on.
 */
export default async function CheckPage({ searchParams }: Props) {
  const preview = previewOf(readQuery((await searchParams).preview), process.env.PAGE_PREVIEWS);
  return <CheckFlow initial={preview ?? { step: "form" }} live={CHECKS_LIVE} />;
}
