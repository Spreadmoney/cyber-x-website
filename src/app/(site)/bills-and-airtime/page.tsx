import type { Metadata } from "next";

import {
  Cta,
  DataRow,
  Grid,
  HeroButtons,
  MockButton,
  Note,
  PageHero,
  Rows,
  Section,
  TYPE,
  Tile,
} from "@/components/kit/Kit";
import { readAddresses } from "@/lib/env/addresses";

export const metadata: Metadata = {
  title: "Bills and airtime",
  description:
    "Electricity, TV, internet, airtime and data. The name on the account is confirmed before you pay.",
};

export default function BillsPage() {
  const { appUrl } = readAddresses();
  return (
    <>
      <PageHero
        tag="Bills and airtime"
        title="Pay the bill. Not the wrong account."
        sub="Electricity, TV, internet, airtime and data. The name on the account is confirmed before you pay."
        after={<HeroButtons appUrl={appUrl} />}
        card={
          <>
            <p className={`${TYPE.cap} text-muted-fg`}>Electricity</p>
            <p className={TYPE.h4}>Ikeja Electric · Prepaid</p>
            <DataRow label="Meter" value="4512 •••• 0981" mono />
            <Note tone="green" icon="check">
              Name on the meter: Adaeze N.
            </Note>
            <div>
              <DataRow label="Amount" value="₦10,000.00" />
              <DataRow label="Fee" value="₦50.00" />
              <DataRow label="Total" value="₦10,050.00" line />
            </div>
            <MockButton label="Pay ₦10,050.00" />
          </>
        }
      />

      <Section
        tone="paper"
        id="what"
        tag="What you can pay"
        title="Everyday bills, done right."
        rosetteAt={[0.9, 0.4]}
      >
        <Grid cols={3}>
          <Tile icon="electricity" title="Electricity" desc="Prepaid tokens and postpaid bills." />
          <Tile icon="calendar" title="TV and internet" desc="Renew before it runs out." />
          <Tile
            icon="phone"
            title="Airtime and data"
            desc="Any network, for you or someone else."
          />
        </Grid>
      </Section>

      <Section id="checked" tag="Checked first" title="No more paying the wrong meter.">
        <Rows
          items={[
            ["The name comes first", "You see the name on the meter or account before you pay."],
            [
              "Your token, kept safe",
              "Electricity tokens stay in your history. Copy or share them any time.",
            ],
            ["Save your billers", "Pay the same bill next month in two taps."],
            [
              "A fee you see first",
              "₦50 per bill, shown before you approve. Airtime and data are free.",
            ],
          ]}
        />
      </Section>

      <Cta appUrl={appUrl} />
    </>
  );
}
