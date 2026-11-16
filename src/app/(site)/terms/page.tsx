import type { Metadata } from "next";

import { InShort, LastUpdated, LegalText, PageHero, Section } from "@/components/kit/Kit";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The agreement between you and Cyber X Technologies when you use Cyber X.",
};

/** DRAFT legal text: a lawyer reviews it before launch. */
export default function TermsPage() {
  return (
    <>
      <PageHero
        tone="paper"
        crumb="Legal"
        title="Terms of use."
        sub="The agreement between you and Cyber X Technologies when you use Cyber X."
        after={<LastUpdated date="16 November 2026" />}
        card={
          <InShort
            lines={[
              "You need to be 18 or older and verified to move money.",
              "Keep your PIN, password and codes to yourself.",
              "We work to stop fraud before money moves. We don’t promise to refund it.",
              "Our fees and limits are on the Fees and limits page.",
            ]}
          />
        }
      />
      <Section id="terms">
        <LegalText
          parts={[
            [
              "Who can use Cyber X",
              "You must be 18 or older, live in Nigeria and have a valid NIN. One account per person.",
            ],
            [
              "Your account",
              "Keep your phone, PIN, password and codes safe. Tell us straight away if they’re lost or shared. You can freeze your account at any time.",
            ],
            [
              "Payments",
              "Check who you’re paying before you approve. Money sent to someone new waits until they accept it, and you can take it back until then. Once accepted, a payment is complete. If something went wrong, report it in the app.",
            ],
            [
              "Pay me safely",
              "The buyer’s money is held until they confirm the order arrived, or until the deadline passes. A dispute needs evidence from both sides.",
            ],
            [
              "What we don’t do",
              "We work to stop fraud before money moves. We don’t promise to pay back money lost to fraud.",
            ],
            [
              "Fees and limits",
              "Our fees and limits are on the Fees and limits page. We’ll tell you before any fee goes up.",
            ],
            [
              "Closing your account",
              "You can close your account in the app. We may freeze or close an account to protect you or others, or when the law requires.",
            ],
            ["Complaints", "See our Complaints page."],
            [
              "The law that applies",
              "These terms are governed by the laws of the Federal Republic of Nigeria.",
            ],
          ]}
        />
      </Section>
    </>
  );
}
