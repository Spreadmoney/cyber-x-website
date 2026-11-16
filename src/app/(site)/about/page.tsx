import type { Metadata } from "next";
import Image from "next/image";

import {
  Columns,
  Cta,
  DataRow,
  Frost,
  Grid,
  HeroButtons,
  PageHero,
  Rows,
  Section,
  TYPE,
  Tile,
} from "@/components/kit/Kit";
import { ArrowLink } from "@/components/site/Button";
import { readAddresses } from "@/lib/env/addresses";
import { href } from "@/lib/site/routes";

export const metadata: Metadata = {
  title: "About",
  description:
    "Cyber X Technologies is building a financial system where every payment knows who it’s for and why.",
};

/**
 * The team pictures are AI samples Ayora approved for the demo (15 Nov 2026),
 * and four of the five names are made up. The page says so, and they are
 * replaced before launch.
 */
const TEAM = [
  { photo: "ayora", name: "Ayora Okafor", role: "Founder" },
  { photo: "emeka", name: "Emeka Obi", role: "Head of Engineering" },
  { photo: "ifeoma", name: "Ifeoma Nwankwo", role: "Head of Risk and Compliance" },
  { photo: "zainab", name: "Zainab Bello", role: "Head of Design" },
  { photo: "seun", name: "Seun Ogunleye", role: "Head of Partnerships" },
] as const;

export default function AboutPage() {
  const { appUrl } = readAddresses();
  return (
    <>
      <PageHero
        tag="About"
        title="Money should reach the right person. Every time."
        sub="Cyber X Technologies is building a financial system where every payment knows who it’s for and why. So fraud has nowhere to hide."
        after={
          <HeroButtons
            appUrl={appUrl}
            first={{ label: "Meet the team", href: "#team" }}
            second={{ label: "Careers", href: href("careers") }}
          />
        }
        card={
          <figure className="flex flex-col gap-4">
            <blockquote className={TYPE.body}>
              <p>
                “Long before Cyber X had a name, I wanted one thing: a way to pay that fraud can’t
                get into. Everything here grew from that.”
              </p>
            </blockquote>
            <figcaption className="flex items-center gap-3">
              <Image
                src="/team/sample-ayora.jpg"
                alt=""
                width={52}
                height={52}
                className="size-[52px] rounded-full object-cover"
              />
              <span className="flex flex-col gap-0.5">
                <span className={TYPE.h4}>Ayora Okafor</span>
                <span className={`${TYPE.cap} text-muted-fg`}>Founder, Cyber X Technologies</span>
              </span>
            </figcaption>
          </figure>
        }
      />

      <Section
        tone="paper"
        id="story"
        tag="Our story"
        title="It started with one question."
        rosetteAt={[0.9, 0.3]}
      >
        <Columns
          leftWidth={520}
          top
          left={
            <>
              <p className={TYPE.body}>
                Why do people lose money to fraud? Because they pay account numbers that can’t say
                who’s behind them, or why the money is moving.
              </p>
              <p className={`${TYPE.body} text-muted-fg`}>
                So we changed what a payment knows. On Cyber X, every payment carries who it’s for,
                why it’s being made, how much is owed and when it should arrive.
              </p>
              <p className={`${TYPE.body} text-muted-fg`}>
                We started in Nigeria, with the moment fraud loves most: paying someone you don’t
                know.
              </p>
            </>
          }
          right={
            <Frost>
              <p className={`${TYPE.cap} text-muted-fg`}>Every payment answers</p>
              <div>
                <DataRow label="Who" value="A verified person" />
                <DataRow label="Why" value="The reason travels with it" line />
                <DataRow label="How much" value="Set by the person being paid" line />
                <DataRow label="When" value="Only when both sides agree" line />
              </div>
            </Frost>
          }
        />
      </Section>

      <Section id="building" tag="What we’re building" title="Three ideas, one system.">
        <Grid cols={3}>
          <Tile
            icon="stop"
            title="Stop fraud first."
            desc="We prevent the bad payment instead of chasing it afterwards."
          />
          <Tile
            icon="settlements"
            title="Change how value moves."
            desc="A payment carries its reason, so both sides know what it’s for."
          />
          <Tile
            icon="spark"
            title="Help money grow."
            desc="Over time, X learns how your money moves and helps you keep more of it."
          />
        </Grid>
      </Section>

      <Section
        tone="blue"
        id="team"
        tag="Team"
        title="The people behind Cyber X."
        rosetteAt={[0.12, 0.3]}
      >
        <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-5 lg:gap-6">
          {TEAM.map((person) => (
            <li
              key={person.name}
              className="shadow-glass flex items-center gap-3.5 rounded-[20px] border border-white/50 bg-white/14 p-3.5 lg:flex-col lg:items-stretch lg:gap-3 lg:rounded-[24px]"
            >
              <Image
                src={`/team/sample-${person.photo}.jpg`}
                alt=""
                width={400}
                height={400}
                sizes="(min-width: 1024px) 200px, 64px"
                className="size-16 rounded-full object-cover lg:aspect-square lg:size-auto lg:w-full lg:rounded-2xl"
              />
              <span className="flex flex-col gap-0.5 lg:px-1 lg:pb-1.5">
                <span className={TYPE.h4}>{person.name}</span>
                <span className={`${TYPE.p} text-white/82`}>{person.role}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className={`${TYPE.cap} text-white/82`}>
          Sample team pictures for the demo. Real photos and names will replace them before launch.
        </p>
        <ArrowLink href={href("careers")} tone="white" className="self-start">
          Join us: Careers
        </ArrowLink>
      </Section>

      <Section
        tone="paper"
        id="promises"
        tag="What we believe"
        title="Our promises."
        rosetteAt={[0.92, 0.25]}
      >
        <Rows
          items={[
            [
              "We stop fraud before the money moves.",
              "We don’t promise refunds. We make the bad payment harder to make.",
            ],
            ["We never sell your data.", "Not to advertisers. Not to anyone."],
            [
              "This website never touches your money.",
              "It can’t show your balance or send a payment.",
            ],
            ["We’ll never ask for your PIN, password or codes.", "Anyone who does isn’t us."],
            ["People come first.", "Every account starts with a verified person."],
          ]}
        />
      </Section>

      <Section
        id="going"
        tag="Where we’re going"
        title="First, protect what you have. Then, grow it."
        sub="Our twenty-year ambition: the system people use to hold, move, earn and grow value, with trust built in."
      >
        <Grid cols={3}>
          <Tile title="Today" desc="Safe payments for people in Nigeria." />
          <Tile
            tag="Coming later"
            title="Next"
            desc="A safety pot, and X suggesting what you approve."
          />
          <Tile
            tag="Coming later"
            title="Later"
            desc="Getting paid from abroad, and tools for the businesses you buy from."
          />
        </Grid>
        <div className="flex flex-wrap gap-6">
          <ArrowLink href={href("careers")}>Careers</ArrowLink>
          <ArrowLink href={href("contact")}>Contact us</ArrowLink>
        </div>
      </Section>

      <Cta
        appUrl={appUrl}
        title="Join us early."
        sub="Get Cyber X on iPhone or Android, or try the demo in your browser."
      />
    </>
  );
}
