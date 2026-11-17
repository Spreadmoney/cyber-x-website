import type { Metadata } from "next";

import { ReportFlow } from "@/components/report/ReportFlow";
import { readQuery } from "@/lib/content/query";
import { REPORT_PREVIEWS } from "@/lib/report/rules";

export const metadata: Metadata = {
  title: "Report a scam",
  description: "Tell us about a fake link, a fake receipt or someone pretending to be Cyber X.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** W7.1 (Figma Report a scam). ?preview=sent|not_live only where PAGE_PREVIEWS=on. */
export default async function ReportPage({ searchParams }: Props) {
  const asked = readQuery((await searchParams).preview);
  const preview =
    process.env.PAGE_PREVIEWS === "on" && Object.hasOwn(REPORT_PREVIEWS, asked)
      ? REPORT_PREVIEWS[asked as keyof typeof REPORT_PREVIEWS]
      : null;
  return <ReportFlow initial={preview ?? { step: "form" }} />;
}
