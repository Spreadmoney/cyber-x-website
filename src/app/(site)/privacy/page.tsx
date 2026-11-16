import type { Metadata } from "next";

import { InShort, LastUpdated, LegalText, PageHero, Section } from "@/components/kit/Kit";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How Cyber X Technologies collects, uses and protects your personal data, in plain words.",
};

/** DRAFT legal text: a lawyer reviews it before launch. */
export default function PrivacyPage() {
  return (
    <>
      <PageHero
        tone="paper"
        crumb="Legal"
        title="Privacy policy."
        sub="How Cyber X Technologies collects, uses and protects your personal data, in plain words."
        after={<LastUpdated date="16 November 2026" />}
        card={
          <InShort
            lines={[
              "We collect what we need to verify you and keep your payments safe.",
              "We never sell your data.",
              "We share it only with partners who help run Cyber X, and with regulators when the law requires.",
              "You can ask to see, correct or delete it.",
            ]}
          />
        }
      />
      <Section id="policy">
        <LegalText
          parts={[
            [
              "Who we are",
              "Cyber X Technologies runs the Cyber X app and this website. For questions about your data, contact our Data Protection Officer through Contact us.",
            ],
            [
              "What we collect",
              [
                [
                  "Identity",
                  "Your name, NIN, a live selfie, your BVN if you add it, and an ID document and proof of address at Tier 3.",
                ],
                ["Contact", "Your phone number, and your email if you add one."],
                ["Payments", "Who you pay and who pays you, amounts, reasons and dates."],
                ["Your phone", "Its model, and the passkey linked to it."],
                ["This website", "The pages you visit, with the cookie choices you make."],
              ],
            ],
            [
              "Why we use it",
              "To check who you are, as the law requires. To make your payments and protect them, including spotting fraud. To answer you when you contact us. To meet our legal duties, such as reporting suspicious activity.",
            ],
            [
              "Who we share it with",
              "Our partner bank, which holds your money. Identity services, to confirm your NIN and BVN. Regulators and law enforcement, when the law requires it. We never sell your data, and X never shares your chats.",
            ],
            [
              "How long we keep it",
              "While your account is open, and for five years after you leave, as anti-money-laundering rules require.",
            ],
            [
              "Your rights",
              [
                ["Know and see", "Ask what we hold, and get a copy."],
                ["Take it with you", "Get a copy in a form you can move."],
                ["Correct it", "Fix anything that’s wrong."],
                ["Delete it", "Where the law allows."],
                ["Object or restrict", "Limit how we use it."],
                ["Withdraw consent", "For anything you agreed to."],
                ["A person, not a machine", "Ask for a person to review an automated decision."],
              ],
              "To use any of these, contact us. If you’re not happy with our answer, you can complain to the Nigeria Data Protection Commission.",
            ],
            ["Changes", "We’ll tell you in the app before this policy changes."],
          ]}
        />
      </Section>
    </>
  );
}
