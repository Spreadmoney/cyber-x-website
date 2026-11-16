import type { Metadata } from "next";

import {
  DataRow,
  Grid,
  HeroButtons,
  IconDisc,
  PageHero,
  Rows,
  Section,
  TYPE,
  Tile,
} from "@/components/kit/Kit";
import { readAddresses } from "@/lib/env/addresses";

export const metadata: Metadata = {
  title: "Ask X",
  description:
    "X is the intelligence inside Cyber X. It answers from your own account, in plain words.",
};

export default function AskXPage() {
  const { appUrl } = readAddresses();
  return (
    <>
      <PageHero
        tag="Ask X"
        title="Ask about any payment."
        sub="X is the intelligence inside Cyber X. It answers from your own account, in plain words."
        after={<HeroButtons appUrl={appUrl} />}
        card={
          <>
            <p className="bg-avatar self-end rounded-2xl px-3.5 py-2.5 text-[15px] leading-[1.5] lg:text-[17px]">
              What did I spend on bills last month?
            </p>
            <div className="flex items-start gap-2.5">
              <span className="size-7 shrink-0">
                <IconDisc icon="spark" size="sm" />
              </span>
              <div className="border-line flex flex-1 flex-col gap-1 rounded-2xl border bg-white px-3.5 py-3">
                <p className={TYPE.h3}>₦18,450.00</p>
                <p className={`${TYPE.small} text-muted-fg`}>on bills in October</p>
                <DataRow label="Electricity" value="₦12,000.00" line />
                <DataRow label="Airtime and data" value="₦4,450.00" />
                <DataRow label="TV" value="₦2,000.00" />
                <p aria-hidden="true" className="text-accent text-[17px] leading-[1.2] font-medium">
                  Open Bills ›
                </p>
              </div>
            </div>
          </>
        }
      />

      <Section tone="paper" id="today" tag="Today" title="What X does now." rosetteAt={[0.9, 0.4]}>
        <Grid cols={2}>
          <Tile
            icon="chat"
            title="Answers"
            desc="Ask about a payment, your limits, or how something works."
          />
          <Tile
            icon="calendar"
            title="A weekly summary"
            desc="Money in, money out, and what you kept."
          />
          <Tile
            icon="clock"
            title="Heads-ups"
            desc="A bill or rent coming due, or a charge that failed."
          />
          <Tile
            icon="add"
            title="Goals"
            desc="Keep this much by this date. X reminds you; it never blocks a payment."
          />
        </Grid>
      </Section>

      <Section id="limits" tag="Limits" title="What X won’t do.">
        <Rows
          items={[
            [
              "Move money on its own",
              "X can fill in a payment for you to check. You approve it, or nothing happens.",
            ],
            ["Give investment advice", "X helps you keep track. The decisions are yours."],
            ["Share your chats", "Your conversations stay yours until you delete them."],
            ["Pretend to be a person", "Need a human? X hands you to our team."],
          ]}
        />
      </Section>

      <Section
        tone="blue"
        id="going"
        tag="Where it’s going"
        title="First it answers. Then it helps you grow."
        rosetteAt={[0.85, 0.4]}
      >
        <Grid cols={3}>
          <Tile
            dark
            title="Today"
            desc="Answers, a weekly summary, and a heads-up before a bill is due."
          />
          <Tile
            dark
            tag="Coming later"
            title="Next"
            desc="X suggests, you approve. A safety pot for what you keep."
          />
          <Tile
            dark
            tag="Coming later"
            title="The long run"
            desc="A plan that fits how you earn and spend."
          />
        </Grid>
        <p className={`${TYPE.p} text-white/82`}>
          X never moves money on its own, and it doesn’t give investment advice.
        </p>
        <HeroButtons appUrl={appUrl} />
      </Section>
    </>
  );
}
