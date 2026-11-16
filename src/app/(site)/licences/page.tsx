import type { Metadata } from "next";

import { PageHero, Rows, Section, TYPE } from "@/components/kit/Kit";
import { ArrowLink } from "@/components/site/Button";
import { Tag } from "@/components/site/Panel";
import { href } from "@/lib/site/routes";

export const metadata: Metadata = {
  title: "Licences and regulation",
  description: "Who oversees the money you hold with Cyber X, and the rules we follow.",
};

/** No partner bank or licence is named until they are confirmed. */
export default function LicencesPage() {
  return (
    <>
      <PageHero
        tone="paper"
        crumb="Legal"
        title="Licences and regulation."
        sub="Who oversees the money you hold with Cyber X, and the rules we follow."
        card={
          <>
            <span className="self-start">
              <Tag tone="paper">Before launch</Tag>
            </span>
            <p className={TYPE.p}>
              Cyber X will launch with a licensed partner bank, which holds your money. We’ll name
              our partner and our licences here once they’re confirmed.
            </p>
          </>
        }
      />
      <Section id="rules" title="The rules we follow">
        <Rows
          items={[
            [
              "Central Bank of Nigeria",
              "Payments, account tiers and limits, and charges follow CBN rules, including the 2026 Guide to Charges.",
            ],
            [
              "Nigeria Data Protection Act 2023",
              "How we handle your personal data. The Nigeria Data Protection Commission oversees it.",
            ],
            [
              "Anti-money-laundering rules",
              "We verify who you are and report suspicious activity, as the law requires.",
            ],
            ["Consumer protection", "How we handle complaints, and when you can go to the CBN."],
          ]}
        />
        <div className="flex flex-wrap gap-6">
          <ArrowLink href={href("feesAndLimits")}>Fees and limits</ArrowLink>
          <ArrowLink href={href("privacy")}>Privacy policy</ArrowLink>
          <ArrowLink href={href("complaints")}>Complaints</ArrowLink>
        </div>
      </Section>
    </>
  );
}
