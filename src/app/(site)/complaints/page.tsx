import type { Metadata } from "next";

import { MessagePage } from "@/components/forms/MessagePage";
import { COMPLAINTS } from "@/components/forms/pages";
import { readQuery } from "@/lib/content/query";
import { messagePreview } from "@/lib/messages/rules";

export const metadata: Metadata = {
  title: "Complaints",
  description: "Tell us when something we did wasn’t right, and how to take it further.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** W7.2 (Figma Complaints, Complaint received). */
export default async function ComplaintsPage({ searchParams }: Props) {
  const preview = messagePreview(
    "complaint",
    readQuery((await searchParams).preview),
    process.env.PAGE_PREVIEWS,
  );
  return (
    <MessagePage
      kind="complaint"
      initial={preview ?? { step: "form" }}
      hero={COMPLAINTS.hero}
      formTitle="Make a complaint"
      aside={COMPLAINTS.aside}
      after={COMPLAINTS.after}
    />
  );
}
