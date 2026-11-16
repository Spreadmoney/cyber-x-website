import type { Metadata } from "next";

import {
  Columns,
  DataRow,
  Glass,
  Grid,
  HeroButtons,
  MockButton,
  Note,
  PageHero,
  Person,
  Rows,
  Section,
  TYPE,
  Tile,
} from "@/components/kit/Kit";
import { ButtonLink } from "@/components/site/Button";
import { readAddresses } from "@/lib/env/addresses";
import { approveLabel } from "@/lib/site/face";
import { href } from "@/lib/site/routes";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Cyber X checks who you’re paying, makes sure it’s really you, and gives you a way out if something goes wrong.",
};

export default async function SecurityPage() {
  const { appUrl } = readAddresses();
  const approve = await approveLabel();
  const android = approve.includes("fingerprint");
  return (
    <>
      <PageHero
        tag="Security"
        title="Fraud stops before the money moves."
        sub="Cyber X checks who you’re paying, makes sure it’s really you, and gives you a way out if something goes wrong."
        after={
          <HeroButtons appUrl={appUrl} second={{ label: "Report a scam", href: href("report") }} />
        }
        card={
          <>
            <p className={`${TYPE.cap} text-muted-fg`}>Approve this payment</p>
            <Person initials="MB" name="Maryam B." handle="@maryam.b · Verified" />
            <div>
              <DataRow label="Amount" value="₦25,000.00" />
              <DataRow label="Fee" value="₦10.00" />
              <DataRow label="Total" value="₦25,010.00" line />
            </div>
            <MockButton label={approve} />
            <p aria-hidden="true" className={`${TYPE.lab} text-accent text-center`}>
              Use my Payment PIN instead
            </p>
          </>
        }
      />

      <Section
        tone="paper"
        id="account"
        tag="Your account"
        title="It’s really you. Every time."
        rosetteAt={[0.9, 0.5]}
      >
        <Grid cols={2}>
          <Tile
            icon="lock"
            title={android ? "Fingerprint or face" : "Face ID or fingerprint"}
            desc="You sign in and approve payments with your body, not a code someone can steal."
          />
          <Tile
            icon="id-card"
            title="A Payment PIN as backup"
            desc="Only you know it. Nobody from Cyber X will ever ask for it."
          />
          <Tile
            icon="phone"
            title="One phone at a time"
            desc="A new phone needs a selfie and approval. In its first 24 hours it can send up to ₦20,000."
          />
          <Tile
            icon="chat"
            title="Recovery contacts"
            desc="People you trust help you back in. Our team can never take over an account alone."
          />
        </Grid>
      </Section>

      <Section id="every-payment" tag="Every payment" title="You see who you’re paying.">
        <Rows
          items={[
            ["Verified names", "Every alias belongs to a person checked against their NIN."],
            ["Age, history and reports", "Shown on the payee card before you pay."],
            [
              "Warnings before risky payments",
              "A first payment to a new seller? We’ll ask you to stop and check.",
            ],
            [
              "Aliases, not account numbers",
              "A new account number from a stranger can’t redirect your money.",
            ],
          ]}
        />
      </Section>

      <Section
        tone="blue"
        id="lost-phone"
        tag="Lost your phone?"
        title="Freeze your account from any browser."
        sub="It takes under a minute, without your phone. No phone at all? Dial the Cyber X USSD code from any phone."
        rosetteAt={[0.85, 0.5]}
      >
        <Columns
          leftWidth={420}
          top
          left={
            <div className="flex flex-col gap-3">
              <ButtonLink
                href={href("freeze")}
                variant="danger"
                className="w-full lg:w-auto lg:self-start"
              >
                Freeze my account
              </ButtonLink>
              <ButtonLink
                href={href("help")}
                variant="outline-light"
                className="w-full lg:w-auto lg:self-start"
              >
                How unfreezing works
              </ButtonLink>
            </div>
          }
          right={
            <Glass>
              <h3 className={TYPE.h4}>This stops straight away</h3>
              <p className={`${TYPE.p} text-white/82`}>
                Money leaving your account, and sign-ins on every phone.
              </p>
              <h3 className={TYPE.h4}>This still works</h3>
              <p className={`${TYPE.p} text-white/82`}>Money coming in still arrives.</p>
              <Note tone="glass">
                To unfreeze, do a short video check with our team in the app.
              </Note>
            </Glass>
          }
        />
      </Section>

      <Section
        tone="paper"
        id="scams"
        tag="Scams"
        title="Five scams, and how Cyber X stops them."
        rosetteAt={[0.92, 0.2]}
      >
        <Rows
          items={[
            [
              "“Our account number has changed.”",
              "You pay an alias, not an account number. A new number from a stranger changes nothing.",
            ],
            [
              "Fake credit alerts",
              "Check the payment in your app, or on our Check a payment page. A text can be faked.",
            ],
            [
              "“Send me the code.”",
              "Nobody from Cyber X will ever ask for your PIN, password or codes.",
            ],
            [
              "“I sent it to you by mistake.”",
              "Use Return this payment in the app. Never send money back by a new transfer.",
            ],
            ["Fake Cyber X support", "We only contact you in the app. Report anything else to us."],
          ]}
        />
        <ButtonLink href={href("report")} className="w-full lg:w-auto lg:self-start">
          Report a scam
        </ButtonLink>
      </Section>

      <Section id="pressure" tag="Under pressure" title="If someone forces you to pay.">
        <Grid cols={2}>
          <Tile
            icon="lock"
            title="A duress PIN"
            desc="Enter it instead of your real PIN. Cyber X looks normal, shows a small balance, and quietly tells our team."
          />
          <Tile
            icon="stop"
            title="Instant payments, your choice"
            desc="You can turn off instant payments in Limits."
          />
        </Grid>
      </Section>

      <Section
        tone="blue"
        id="privacy"
        tag="Privacy"
        title="Your data stays yours."
        rosetteAt={[0.15, 0.5]}
      >
        <Grid cols={3}>
          <Tile
            dark
            icon="lock"
            title="We never sell your data."
            desc="Not to advertisers. Not to anyone."
          />
          <Tile
            dark
            icon="stop"
            title="This website never touches your money."
            desc="It can’t show your balance or send a payment."
          />
          <Tile
            dark
            icon="clock"
            title="Records, as the law asks."
            desc="We keep them for five years after you leave."
          />
        </Grid>
        <ButtonLink
          href={href("getTheApp")}
          variant="white"
          className="w-full lg:w-auto lg:self-start"
        >
          Get the app
        </ButtonLink>
      </Section>
    </>
  );
}
