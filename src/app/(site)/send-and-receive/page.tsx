import type { Metadata } from "next";

import {
  Avatar,
  Columns,
  Cta,
  DataRow,
  Frost,
  Glass,
  Grid,
  HeroButtons,
  MockButton,
  MockField,
  Note,
  PageHero,
  Person,
  Rows,
  Section,
  TYPE,
  Tile,
} from "@/components/kit/Kit";
import { ArrowLink } from "@/components/site/Button";
import { Tag } from "@/components/site/Panel";
import { TRANSFER_BAND } from "@/content/fees";
import { readAddresses } from "@/lib/env/addresses";
import { approveLabel } from "@/lib/site/face";
import { href } from "@/lib/site/routes";

export const metadata: Metadata = {
  title: "Send and receive",
  description:
    "Send to an alias or Cyber X ID, scan a code, or ask for money. You always see who’s on the other side.",
};

const SPLIT = [
  ["AO", "@ayora", "₦12,000.00 · Paid", "ok"],
  ["MB", "@maryam.b", "₦12,000.00 · Paid", "ok"],
  ["CE", "@chidi", "₦12,000.00 · Waiting", "warn"],
] as const;

export default async function SendAndReceivePage() {
  const { appUrl } = readAddresses();
  const approve = await approveLabel();
  return (
    <>
      <PageHero
        tag="Send and receive"
        title="Pay people by name. Not by numbers."
        sub="Send to an alias or Cyber X ID, scan a code, or ask for money. You always see who’s on the other side."
        after={<HeroButtons appUrl={appUrl} />}
        card={
          <>
            <MockField label="To" value="@maryam.b" icon="search" />
            <Person initials="MB" name="Maryam B." handle="@maryam.b · Verified" />
            <div>
              <DataRow label="Amount" value="₦25,000.00" line />
              <DataRow label="Fee" value="₦10.00" />
              <DataRow label="Total" value="₦25,010.00" line />
            </div>
            <MockButton label={approve} />
          </>
        }
      />

      <Section tone="paper" id="pay" tag="Pay" title="Four ways to pay." rosetteAt={[0.9, 0.3]}>
        <Grid cols={2}>
          <Tile
            icon="send"
            title="An alias"
            desc="Like @kemi.fabrics. Short, easy to say, and checked."
          />
          <Tile
            icon="id-card"
            title="A Cyber X ID"
            desc="Like CX-8MKA-4F6R-J9TB. Permanent, and only theirs."
          />
          <Tile
            icon="camera"
            title="A QR code"
            desc="A scan always says “You are paying” and shows the name."
          />
          <Tile
            icon="chat"
            title="A payment link"
            desc="Sellers share a link. You see who it’s from before you pay."
          />
        </Grid>
        <Note tone="blue">
          Never a phone number or an account number. That’s how fraud gets in.
        </Note>
      </Section>

      <Section
        id="get-paid"
        tag="Get paid"
        title="Ask for money the right way."
        sub="The person being paid sets the amount and the reason."
      >
        <Columns
          leftWidth={520}
          left={
            <Rows
              labelWidth={200}
              items={[
                [
                  "Request money",
                  "Send a request to a mutual: someone you’ve both saved. Strangers can’t send you requests.",
                ],
                [
                  "Share your alias or QR",
                  "Anyone can pay you with it. Your account number stays private.",
                ],
                [
                  "Accept, decline or return",
                  "Money from someone new waits in Settlements for your yes.",
                ],
              ]}
            />
          }
          right={
            <Frost>
              <p className={`${TYPE.cap} text-muted-fg`}>Request from @tunde</p>
              <p className={TYPE.amt}>₦12,000.00</p>
              <div>
                <DataRow label="For" value="Taxi share, Friday" line />
                <DataRow label="Due" value="20 Nov" line />
              </div>
              <MockButton label="Send request" />
            </Frost>
          }
        />
      </Section>

      <Section
        tone="blue"
        id="waits"
        tag="Money that waits"
        title="Changed your mind? Take it back."
        sub="A payment to someone new waits until they accept it. Until then, it’s still yours."
        rosetteAt={[0.85, 0.5]}
      >
        <Columns
          leftWidth={520}
          left={
            <Rows
              dark
              labelWidth={200}
              items={[
                [
                  "Take it back",
                  "It costs the same small fee as sending. The send fee isn’t returned.",
                ],
                [
                  "Or let it return",
                  "Not accepted in 72 hours? It comes back by itself, with nothing extra to pay.",
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
        id="split"
        tag="Split a bill"
        title="Split it in seconds."
        sub="Pick the people and the shares. Everyone gets a request."
        rosetteAt={[0.9, 0.5]}
      >
        <Frost className="lg:w-[520px]">
          <p className={TYPE.h4}>Dinner, Saturday</p>
          <p className={TYPE.amt}>₦36,000.00</p>
          <ul>
            {SPLIT.map(([initials, handle, status, tone]) => (
              <li key={handle} className="flex items-center gap-3 py-1.5">
                <Avatar initials={initials} size={32} />
                <span className={`flex-1 ${TYPE.p}`}>{handle}</span>
                <span
                  className={`${TYPE.small} ${tone === "ok" ? "text-success" : "text-warn-fg"}`}
                >
                  {status}
                </span>
              </li>
            ))}
          </ul>
        </Frost>
      </Section>

      <Section id="good-to-know" tag="Good to know" title="Fees, limits and what’s next.">
        <Rows
          items={[
            ["Fees", TRANSFER_BAND.replaceAll(" · ", ". ") + "."],
            ["Limits", "Your tier sets how much you can send each day."],
            ["Tap to pay · Coming later", "Tap phones together to pay. We’re working on it."],
          ]}
        />
        <ArrowLink href={href("feesAndLimits")} className="self-start">
          Fees and limits
        </ArrowLink>
      </Section>

      <Cta appUrl={appUrl} />
    </>
  );
}
