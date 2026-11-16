import type { Metadata } from "next";

import {
  Avatar,
  Cta,
  Grid,
  HeroButtons,
  MockButton,
  Note,
  PageHero,
  Section,
  TYPE,
  Tile,
} from "@/components/kit/Kit";
import { readAddresses } from "@/lib/env/addresses";

export const metadata: Metadata = {
  title: "Online payments",
  description:
    "One payment number per merchant. Set a cap, and stop it any time without touching anything else.",
};

const NUMBERS = [
  ["NF", "Netflix", "Recurring · cap ₦6,000.00", "•••• 3392"],
  ["SP", "Spotify", "Recurring", "•••• 7710"],
  ["JU", "Jumia", "One-off · Used", "•••• 2286"],
] as const;

export default function OnlinePaymentsPage() {
  const { appUrl } = readAddresses();
  return (
    <>
      <PageHero
        tag="Online payments"
        title="One payment number per merchant."
        sub="Use it at checkout instead of your card. Set a cap. Stop it any time without touching anything else."
        after={<HeroButtons appUrl={appUrl} />}
        card={
          <>
            <p className={`${TYPE.cap} text-muted-fg`}>Your payment numbers</p>
            <ul>
              {NUMBERS.map(([initials, name, kind, number]) => (
                <li key={name} className="flex items-center gap-3 py-1.5">
                  <Avatar initials={initials} size={36} />
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className={TYPE.h4}>{name}</span>
                    <span className={`${TYPE.cap} text-muted-fg`}>{kind}</span>
                  </span>
                  <span className={TYPE.mono}>{number}</span>
                </li>
              ))}
            </ul>
            <MockButton label="New payment number" />
          </>
        }
      />

      <Section
        tone="paper"
        id="steps"
        tag="How it works"
        title="Three steps."
        rosetteAt={[0.9, 0.4]}
      >
        <Grid cols={3}>
          <Tile
            big="1"
            title="Pick the merchant."
            desc="Search the list. Not every merchant works yet; we add more over time."
          />
          <Tile big="2" title="Choose how it charges." desc="Once, or every month." />
          <Tile
            big="3"
            title="Set a cap, then pay."
            desc="Use the number at checkout, just like a card."
          />
        </Grid>
      </Section>

      <Section id="control" tag="You’re in control" title="Stop one. Keep the rest.">
        <Grid cols={3}>
          <Tile icon="stop" title="Spend caps" desc="A charge over your cap is declined." />
          <Tile
            icon="freeze"
            title="Stop a merchant"
            desc="Stop one number. Everything else keeps working."
          />
          <Tile
            icon="flag"
            title="Early warnings"
            desc="A failed charge shows in amber before it becomes a problem."
          />
        </Grid>
        <Note>Free to create and to use.</Note>
      </Section>

      <Cta appUrl={appUrl} />
    </>
  );
}
