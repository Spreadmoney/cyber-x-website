import type { Metadata } from "next";

import { LastUpdated, LegalText, PageHero, Section, Table } from "@/components/kit/Kit";
import { CookieChoices } from "@/components/pages/CookieChoices";

export const metadata: Metadata = {
  title: "Cookie policy",
  description: "What cookies this website uses, and the choices you have.",
};

/** DRAFT legal text: a lawyer reviews it before launch. */
export default function CookiesPage() {
  return (
    <>
      <PageHero
        tone="paper"
        crumb="Legal"
        title="Cookie policy."
        sub="What cookies this website uses, and the choices you have."
        after={<LastUpdated date="16 November 2026" />}
        card={<CookieChoices />}
      />
      <Section id="cookies">
        <LegalText
          parts={[
            [
              "What a cookie is",
              "A small file a website stores in your browser, so it can remember things between pages.",
            ],
          ]}
        />
        <Table
          caption="The cookies this website uses"
          columns={["Type", "What it does", "How long"]}
          rows={[
            [
              "Essential",
              "Keeps you signed in and keeps the site secure, including when you freeze your account.",
              "Until you sign out, or 24 hours",
            ],
            ["Preferences", "Remembers choices, like your cookie settings.", "12 months"],
            [
              "Analytics",
              "Tells us which pages people use, without identifying you. Only with your permission.",
              "12 months",
            ],
          ]}
        />
        <LegalText
          parts={[
            [
              "No advertising cookies",
              "We don’t use cookies for advertising, and we don’t let advertisers place them.",
            ],
            ["Changing your mind", "Change your choices any time from Cookies in the footer."],
          ]}
        />
      </Section>
    </>
  );
}
