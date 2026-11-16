import type { Metadata } from "next";

import {
  Cta,
  DataRow,
  Faq,
  Grid,
  HeroButtons,
  MockButton,
  Note,
  PageHero,
  Section,
  TYPE,
  Tile,
} from "@/components/kit/Kit";
import { ReviewCard } from "@/components/pages/ReviewCard";
import { ArrowLink } from "@/components/site/Button";
import { getCountryPack } from "@/config/countries";
import { readAddresses } from "@/lib/env/addresses";
import { formatMoney } from "@/lib/money";
import { href } from "@/lib/site/routes";

export const metadata: Metadata = {
  title: "Add and withdraw",
  description:
    "Add money by bank transfer, card or cash at a partner agent. Withdraw to your bank whenever you like.",
};

export default function AddAndWithdrawPage() {
  const { appUrl } = readAddresses();
  const pack = getCountryPack();
  const tierText = (id: 1 | 2 | 3) => {
    const tier = pack.tiers[id - 1]!;
    return {
      big: formatMoney(tier.dailyLimit, pack.currency),
      keep: tier.maxBalance === null ? null : formatMoney(tier.maxBalance, pack.currency),
    };
  };
  const [t1, t2, t3] = [tierText(1), tierText(2), tierText(3)];
  return (
    <>
      <PageHero
        tag="Add and withdraw"
        title="Your money in. Your money out."
        sub="Add money by bank transfer, card or cash at a partner agent. Withdraw to your bank whenever you like."
        after={<HeroButtons appUrl={appUrl} />}
        card={
          <>
            <p className={`${TYPE.cap} text-muted-fg`}>Add money by bank transfer</p>
            <p className={`${TYPE.small} text-muted-fg`}>Your Cyber X account number</p>
            <p className={TYPE.monoL}>9012 345 678</p>
            <DataRow label="Account name" value="Ayora Okafor" line />
            <MockButton label="Copy number" variant="secondary" />
            <Note tone="blue">Only for adding your own money. People pay you by alias.</Note>
          </>
        }
      />

      <Section
        tone="paper"
        id="add"
        tag="Add money"
        title="Three ways to add money."
        rosetteAt={[0.9, 0.4]}
      >
        <Grid cols={3}>
          <Tile
            icon="bank"
            title="Bank transfer"
            desc="Free, from any Nigerian bank, to your own account number."
          />
          <Tile icon="card" title="Card" desc="Scan your card instead of typing. A 0.5% fee." />
          <Tile
            icon="settlements"
            title="Cash at an agent"
            desc="Hand cash to a partner agent near you. It goes straight into your account."
          />
        </Grid>
      </Section>

      <Section
        id="withdraw"
        tag="Withdraw"
        title="Out to your bank."
        sub="Withdraw to a Nigerian bank account in your name. The fee and total show before you approve."
      >
        <ReviewCard title="Review your withdrawal" button="Withdraw ₦25,000.00" />
      </Section>

      <Section
        tone="blue"
        id="limits"
        tag="Limits"
        title="Limits that grow with you."
        rosetteAt={[0.12, 0.3]}
      >
        <Grid cols={3}>
          <Tile
            dark
            tag="Tier 1"
            big={t1.big}
            title="a day"
            desc={`Keep up to ${t1.keep}. Verify with your NIN and a selfie.`}
          />
          <Tile
            dark
            tag="Tier 2"
            big={t2.big}
            title="a day"
            desc={`Keep up to ${t2.keep}. Add your BVN.`}
          />
          <Tile
            dark
            tag="Tier 3"
            big={t3.big}
            title="a day"
            desc="No balance limit. Add an ID document and proof of address."
          />
        </Grid>
        <p className={`${TYPE.p} text-white/82`}>
          Withdrawals share your daily limit. These limits are set by the Central Bank of Nigeria.
        </p>
        <ArrowLink href={href("feesAndLimits")} tone="white" className="self-start">
          Fees and limits
        </ArrowLink>
      </Section>

      <Section
        tone="paper"
        id="questions"
        tag="Questions"
        title="Good to know."
        rosetteAt={[0.92, 0.3]}
      >
        <Faq
          items={[
            [
              "Can people pay me with my account number?",
              "No. Your account number is only for adding your own money. People pay your alias or Cyber X ID.",
            ],
            [
              "Can I link my bank account?",
              "Not yet. For now, add money by transfer, card or cash.",
            ],
            [
              "What does it cost to add money?",
              "A bank transfer is free. A card is 0.5% of the amount.",
            ],
          ]}
        />
      </Section>

      <Cta appUrl={appUrl} />
    </>
  );
}
