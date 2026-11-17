import type { Metadata } from "next";

import { MessagePage } from "@/components/forms/MessagePage";
import { CAREERS } from "@/components/forms/pages";
import { readQuery } from "@/lib/content/query";
import { messagePreview } from "@/lib/messages/rules";

export const metadata: Metadata = {
  title: "Careers",
  description: "No open roles right now. If you’d like to help build Cyber X, introduce yourself.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** W7.2 (Figma Careers). No invented job openings. */
export default async function CareersPage({ searchParams }: Props) {
  const preview = messagePreview(
    "careers",
    readQuery((await searchParams).preview),
    process.env.PAGE_PREVIEWS,
  );
  return (
    <MessagePage
      kind="careers"
      initial={preview ?? { step: "form" }}
      hero={
        <>
          {CAREERS.hero}
          {CAREERS.values}
        </>
      }
      formTag="Open roles"
      formTitle="No open roles right now."
      formSub="We’ll post them here. If you’d like to help build Cyber X, tell us what you’d bring."
      after={CAREERS.after}
    />
  );
}
