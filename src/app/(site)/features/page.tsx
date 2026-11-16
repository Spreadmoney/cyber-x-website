import type { Metadata } from "next";

import {
  Columns,
  Cta,
  DataRow,
  Glass,
  Grid,
  HeroButtons,
  IconDisc,
  PageHero,
  Rows,
  Section,
  Steps,
  TYPE,
  Tile,
  VideoSlot,
} from "@/components/kit/Kit";
import { ArrowLink } from "@/components/site/Button";
import type { IconName } from "@/components/site/Icon";
import { readAddresses } from "@/lib/env/addresses";
import { href } from "@/lib/site/routes";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Pay people by name, buy from strangers safely, pay your bills and ask about your money. One app.",
};

const IN_THE_APP: readonly [IconName | "spark", string][] = [
  ["send", "Pay by name"],
  ["check", "Pay me safely"],
  ["search", "Check before you trust"],
  ["electricity", "Bills and airtime"],
  ["card", "Online payments"],
  ["spark", "Ask X"],
];

export default function FeaturesPage() {
  const { appUrl } = readAddresses();
  return (
    <>
      <PageHero
        tag="Features"
        title="Everything Cyber X does today."
        sub="Pay people by name, buy from strangers safely, pay your bills and ask about your money. One app."
        after={<HeroButtons appUrl={appUrl} />}
        card={
          <>
            <p className={`${TYPE.cap} text-muted-fg`}>In the app</p>
            <ul className="flex flex-col gap-3">
              {IN_THE_APP.map(([icon, label]) => (
                <li key={label} className="flex items-center gap-3">
                  <IconDisc icon={icon} size="sm" />
                  <span className={TYPE.h4}>{label}</span>
                </li>
              ))}
            </ul>
          </>
        }
      />

      <Section
        tone="paper"
        id="watch"
        tag="Watch"
        title="See it in 90 seconds."
        sub="A short film of everything in the app today."
        rosetteAt={[0.1, 0.2]}
      >
        <VideoSlot title="Cyber X in 90 seconds" length="1:30" />
      </Section>

      <Section id="send" tag="Send and receive" title="Pay people, not numbers.">
        <Grid cols={3}>
          <Tile
            icon="send"
            title="Pay by name"
            desc="Send to an alias like @kemi.fabrics or a Cyber X ID. Never a phone or account number."
          />
          <Tile
            icon="camera"
            title="Scan to pay"
            desc="A scan always shows who you’re paying before you approve."
          />
          <Tile
            icon="add"
            title="Request money"
            desc="You set the amount and the reason. Requests only go to people you’ve both saved."
          />
          <Tile
            icon="settlements"
            title="Split a bill"
            desc="Everyone gets a request for their share."
          />
          <Tile
            icon="clock"
            title="Money that waits"
            desc="A payment to someone new waits for their yes. Until then, you can take it back."
          />
          <Tile
            icon="phone"
            tag="Coming later"
            title="Tap to pay"
            desc="Tap phones to pay. We’re working on it."
          />
        </Grid>
        <ArrowLink href={href("sendAndReceive")} className="self-start">
          Send and receive
        </ArrowLink>
      </Section>

      <Section
        tone="blue"
        id="pay-me-safely"
        tag="Pay me safely"
        title="Buy from strangers without the fear."
        sub="Your money is held until your order arrives. The seller sees “Payment secured” and sends it."
        rosetteAt={[0.85, 0.4]}
      >
        <Columns
          leftWidth={520}
          left={
            <Steps
              dark
              items={[
                ["You pay. Cyber X holds it.", "It doesn’t reach the seller yet."],
                ["The seller sends your order.", "They can see your money is secured."],
                ["You confirm it arrived.", "Then the seller is paid."],
              ]}
            />
          }
          right={
            <Glass>
              <p className={TYPE.h3}>Ankara fabric, 6 yards</p>
              <p className={`${TYPE.cap} text-white/82`}>From @kemi.fabrics · Verified</p>
              <DataRow dark label="Held by Cyber X" value="₦18,500.00" />
              <DataRow dark label="Kemi sends it by" value="18 Nov" />
              <DataRow dark label="Then" value="You confirm it arrived" />
            </Glass>
          }
        />
        <Rows
          dark
          items={[
            [
              "For sellers",
              "Share a Pay me safely link with your trust badge. Buyers without the app can pay by card.",
            ],
            ["If it never comes", "Your own money goes back to you. Nothing to chase."],
          ]}
        />
      </Section>

      <Section
        tone="paper"
        id="check"
        tag="Check before you trust"
        title="Look before you pay."
        rosetteAt={[0.9, 0.5]}
      >
        <Grid cols={2}>
          <Tile
            icon="search"
            title="Check a person"
            desc="Look up an alias, ID or Instagram handle. See their verified name and any scam reports."
          />
          <Tile
            icon="check"
            title="Check a payment"
            desc="Got a receipt or an alert? Check it’s real on our website before you hand anything over."
            link={{ label: "Check a payment", href: href("check") }}
          />
        </Grid>
      </Section>

      <Section id="everyday" tag="Everyday money" title="The rest of your money, in one place.">
        <Grid cols={4}>
          <Tile
            icon="electricity"
            title="Bills and airtime"
            desc="The name on the account is confirmed before you pay."
            link={{ label: "Bills and airtime", href: href("billsAndAirtime") }}
          />
          <Tile
            icon="card"
            title="Online payments"
            desc="One payment number per merchant, with a cap you set."
            link={{ label: "Online payments", href: href("onlinePayments") }}
          />
          <Tile
            icon="bank"
            title="Add and withdraw"
            desc="Bank transfer, card or cash at an agent. Out to your bank any time."
            link={{ label: "Add and withdraw", href: href("addAndWithdraw") }}
          />
          <Tile
            icon="spark"
            title="Ask X"
            desc="Answers about your money, from your own account."
            link={{ label: "Ask X", href: href("askX") }}
          />
        </Grid>
      </Section>

      <Section
        tone="blue"
        id="protection"
        tag="Protection built in"
        title="Safe by default."
        rosetteAt={[0.15, 0.3]}
      >
        <Grid cols={2}>
          <Tile
            dark
            icon="freeze"
            title="Freeze from any browser"
            desc="Lost your phone? Freeze your account on this website in under a minute."
          />
          <Tile
            dark
            icon="phone"
            title="One phone at a time"
            desc="A new phone needs a selfie and approval before it can pay."
          />
          <Tile
            dark
            icon="lock"
            title="A duress PIN"
            desc="Forced to pay? A second PIN shows a small balance and quietly alerts our team."
          />
          <Tile
            dark
            icon="check"
            title="Alerts that can’t be faked"
            desc="Every payment shows in your app, where a fake text can’t reach."
          />
        </Grid>
        <ArrowLink href={href("security")} tone="white" className="self-start">
          Security
        </ArrowLink>
      </Section>

      <Section
        tone="paper"
        id="next"
        tag="Coming later"
        title="What’s next."
        sub="These aren’t in the app yet. We’ll tell you when they are."
        rosetteAt={[0.9, 0.6]}
      >
        <Grid cols={3}>
          <Tile icon="phone" title="Tap to pay" desc="Tap phones together to pay." />
          <Tile
            icon="bank"
            title="A safety pot"
            desc="Put money aside for emergencies, with X keeping you on track."
          />
          <Tile
            icon="settlements"
            title="Money from abroad"
            desc="Get paid by family and clients overseas, through a licensed partner."
          />
          <Tile
            icon="chat"
            title="Invite friends"
            desc="Bring the people you pay most onto Cyber X."
          />
          <Tile
            icon="calendar"
            title="Gift codes"
            desc="Send money for weddings, birthdays and naming ceremonies."
          />
        </Grid>
      </Section>

      <Cta appUrl={appUrl} />
    </>
  );
}
