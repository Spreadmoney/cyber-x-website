import type { Metadata } from "next";

import { Cta, LastUpdated, Note, PageHero, Rows, Section, Table } from "@/components/kit/Kit";
import { FeeCalculator } from "@/components/pages/FeeCalculator";
import { ReviewCard } from "@/components/pages/ReviewCard";
import { getCountryPack } from "@/config/countries";
import { FEES_UPDATED, TRANSFER_BAND } from "@/content/fees";
import { readAddresses } from "@/lib/env/addresses";
import { approveLabel } from "@/lib/site/face";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = {
  title: "Fees and limits",
  description:
    "Every fee, before you pay it. Transfer fees follow the Central Bank of Nigeria’s 2026 Guide to Charges.",
};

export default async function FeesPage() {
  const { appUrl } = readAddresses();
  const approve = await approveLabel();
  const pack = getCountryPack();
  const money = (kobo: number | null) =>
    kobo === null ? "No limit" : formatMoney(kobo, pack.currency);
  const [t1, t2, t3] = pack.tiers;
  return (
    <>
      <PageHero
        tone="paper"
        tag="Fees and limits"
        title="Fees and limits."
        sub="Every fee, before you pay it. Our transfer fees follow the Central Bank of Nigeria’s 2026 Guide to Charges."
        after={<LastUpdated date={FEES_UPDATED} />}
        card={<FeeCalculator />}
      />

      <Section id="fees" tag="Fees" title="What things cost.">
        <Table
          caption="What things cost"
          columns={["Service", "Fee", "Good to know"]}
          rows={[
            ["Pay someone on Cyber X", TRANSFER_BAND, "The CBN’s cap for transfers"],
            ["Take back a waiting payment", "The same as sending", "The send fee isn’t returned"],
            ["Withdraw to your bank", TRANSFER_BAND, "The CBN’s cap for transfers"],
            ["Add money by bank transfer", "Free", ""],
            ["Add money by card", "0.5% of the amount", "The CBN’s cap on card payments"],
            ["Bills", "₦50 per bill", "Shown before you pay"],
            ["Airtime and data", "Free", ""],
            ["Online payment numbers", "Free", "To create and to use"],
            [
              "Pay me safely",
              "Free for buyers",
              "When a buyer pays by card, the seller pays the card fee",
            ],
          ]}
        />
        <Note>
          Government charges, such as stamp duty, are set by law and shown before you approve.
        </Note>
      </Section>

      <Section
        tone="paper"
        id="limits"
        tag="Limits"
        title="How much you can move."
        rosetteAt={[0.92, 0.2]}
      >
        <Table
          caption="How much you can move"
          columns={["Tier", "What you verify", "Send per day", "Keep in your account"]}
          rows={[
            ["Tier 1", "NIN and a selfie", money(t1!.dailyLimit), money(t1!.maxBalance)],
            ["Tier 2", "Tier 1, plus your BVN", money(t2!.dailyLimit), money(t2!.maxBalance)],
            [
              "Tier 3",
              "Tier 2, plus an ID document and proof of address",
              money(t3!.dailyLimit),
              money(t3!.maxBalance),
            ],
          ]}
        />
        <Rows
          items={[
            ["Withdrawals", "Share your daily send limit."],
            [
              "A new phone",
              `Can send up to ${money(pack.newDeviceCap.amount).replace(".00", "")} in its first ${pack.newDeviceCap.hours} hours.`,
            ],
            ["Who sets them", "These limits are set by the Central Bank of Nigeria."],
          ]}
        />
      </Section>

      <Section
        id="no-surprises"
        tag="No surprises"
        title="Shown before you approve."
        sub="Every fee appears on the review screen, with the total, before you approve. We’ll tell you before any fee goes up."
      >
        <ReviewCard title="Review your withdrawal" button={approve} />
      </Section>

      <Cta appUrl={appUrl} />
    </>
  );
}
