import type { Metadata } from "next";

import {
  Columns,
  Cta,
  DataRow,
  Frost,
  Glass,
  Grid,
  HeroButtons,
  MockButton,
  Note,
  OkBadge,
  PageHero,
  Person,
  Rows,
  Section,
  Steps,
  TYPE,
  Tile,
} from "@/components/kit/Kit";
import { ArrowLink, ButtonLink } from "@/components/site/Button";
import { Tag } from "@/components/site/Panel";
import { readAddresses } from "@/lib/env/addresses";
import { approveLabel } from "@/lib/site/face";
import { href } from "@/lib/site/routes";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "What happens between tapping Pay and the money arriving, and why a fraudster can’t get in the middle.",
};

export default async function HowItWorksPage() {
  const { appUrl } = readAddresses();
  const approve = await approveLabel();
  return (
    <>
      <PageHero
        tag="How it works"
        title="Trust, built into every payment."
        sub="What happens between tapping Pay and the money arriving, and why a fraudster can’t get in the middle."
        after={<HeroButtons appUrl={appUrl} />}
        card={
          <>
            <p className={`${TYPE.cap} text-muted-fg`}>You’re paying</p>
            <Person initials="KA" name="Kemi Adebayo" handle="@kemi.fabrics · Verified" />
            <div>
              <DataRow label="On Cyber X since" value="March 2026" />
              <DataRow label="Protected sales" value="31" />
              <DataRow label="Scam reports" value="None" tone="ok" />
              <DataRow label="Amount" value="₦18,500.00" line />
            </div>
            <MockButton label={approve} />
          </>
        }
      />

      <Section
        tone="paper"
        id="steps"
        tag="Five steps"
        title="From sign-up to settled."
        rosetteAt={[0.9, 0.4]}
      >
        <Columns
          leftWidth={520}
          left={
            <Steps
              items={[
                ["Verify once.", "Your NIN and a live selfie prove it’s you."],
                ["Get your ID and alias.", "A permanent Cyber X ID, and a short alias people pay."],
                [
                  "See who you’re paying.",
                  "Their verified name, account age and any scam reports.",
                ],
                [
                  "Approve with your face.",
                  "Face ID or your fingerprint. Your Payment PIN is the backup.",
                ],
                ["Money waits for a yes.", "A payment to someone new waits until they accept it."],
              ]}
            />
          }
          right={
            <Frost>
              <p className={`${TYPE.cap} text-muted-fg`}>Your Cyber X ID</p>
              <p className={TYPE.h3}>@ayora</p>
              <p className={TYPE.mono}>CX-7K2M-9QF4-T3XD</p>
              <span className="self-start">
                <Tag tone="paper">Tier 1 · Verified with NIN</Tag>
              </span>
              <Note tone="blue">People pay your alias or ID. Never a phone or account number.</Note>
            </Frost>
          }
        />
      </Section>

      <Section
        id="payee"
        tag="The payee card"
        title="Know who’s on the other side."
        sub="Before any money moves, Cyber X shows you who you’re about to pay."
      >
        <Grid cols={3}>
          <Tile
            icon="id-card"
            title="A verified name"
            desc="Checked against their NIN. Strangers see a first name and last initial."
          />
          <Tile
            icon="clock"
            title="Account age and history"
            desc="A brand-new account selling a car is a warning sign. You’ll see it."
          />
          <Tile
            icon="flag"
            title="Scam reports"
            desc="If others have reported them, you’ll know before you pay."
          />
        </Grid>
      </Section>

      <Section
        tone="blue"
        id="waits"
        tag="Money that waits"
        title="Sent isn’t the same as gone."
        sub="Money you send to someone new waits until they accept it."
        rosetteAt={[0.85, 0.55]}
      >
        <Columns
          leftWidth={520}
          left={
            <Rows
              dark
              labelWidth={200}
              items={[
                ["Take it back", "Until they accept, it’s still yours to take back."],
                ["Or let it return", "Not accepted in 72 hours? It comes back by itself."],
                [
                  "Return this payment",
                  "Got money you weren’t expecting? Send it back in one tap.",
                ],
              ]}
            />
          }
          right={
            <Glass>
              <p className={TYPE.h3}>₦25,000.00 to @tunde</p>
              <span className="self-start">
                <Tag tone="blue">Waiting to be accepted</Tag>
              </span>
              <DataRow dark label="Sent" value="15 Nov, 10:05" />
              <DataRow dark label="Returns by itself" value="18 Nov, 10:05" />
              <MockButton label="Take it back" variant="ghost" />
            </Glass>
          }
        />
      </Section>

      <Section
        tone="paper"
        id="safely"
        tag="Pay me safely"
        title="Buying from a stranger? Your money waits there too."
        sub="The seller is only paid when your order arrives."
        rosetteAt={[0.9, 0.3]}
      >
        <Grid cols={3}>
          <Tile
            big="1"
            title="You pay. Cyber X holds it."
            desc="The money leaves your balance but doesn’t reach the seller yet."
          />
          <Tile
            big="2"
            title="The seller sends it."
            desc="They see “Payment secured”, so they know you’re serious."
          />
          <Tile
            big="3"
            title="You confirm. They’re paid."
            desc="If it doesn’t arrive in time, your money comes back to you."
          />
        </Grid>
        <ArrowLink href={href("features")} className="self-start">
          More on Features
        </ArrowLink>
      </Section>

      <Section
        id="alerts"
        tag="Alerts that can’t be faked"
        title="A text can lie. Your app can’t."
        sub="Every payment shows in your Cyber X app. Anyone can check a receipt on our website in seconds."
      >
        <Columns
          leftWidth={420}
          left={
            <ButtonLink
              href={href("check")}
              variant="soft"
              className="w-full lg:w-auto lg:self-start"
            >
              Check a payment
            </ButtonLink>
          }
          right={
            <Frost>
              <OkBadge />
              <p className={TYPE.h3}>This payment is real.</p>
              <div>
                <DataRow label="Amount" value="₦25,000.00" />
                <DataRow label="From" value="Maryam B." line />
                <DataRow label="Reference" value="DX-7741-0912" line mono />
              </div>
            </Frost>
          }
        />
      </Section>

      <Cta appUrl={appUrl} />
    </>
  );
}
