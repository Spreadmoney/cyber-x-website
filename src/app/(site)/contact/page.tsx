import type { Metadata } from "next";

import { MessagePage } from "@/components/forms/MessagePage";
import { CONTACT } from "@/components/forms/pages";
import { readQuery } from "@/lib/content/query";
import { messagePreview } from "@/lib/messages/rules";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Freeze your account, report a scam, or send us a message.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** W7.2 (Figma Contact us, Message sent). */
export default async function ContactPage({ searchParams }: Props) {
  const preview = messagePreview(
    "contact",
    readQuery((await searchParams).preview),
    process.env.PAGE_PREVIEWS,
  );
  return (
    <MessagePage
      kind="contact"
      initial={preview ?? { step: "form" }}
      hero={CONTACT.hero}
      formTitle="Send us a message"
      aside={CONTACT.aside}
    />
  );
}
