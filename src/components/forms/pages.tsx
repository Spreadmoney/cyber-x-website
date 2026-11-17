import {
  Frost,
  Grid,
  Note,
  PageHero,
  Rows,
  Section,
  Steps,
  TYPE,
  Tile,
} from "@/components/kit/Kit";
import { ButtonLink } from "@/components/site/Button";
import { SiteLink } from "@/components/site/SiteLink";
import { href } from "@/lib/site/routes";

/** The fixed parts of Contact us, Complaints and Careers (Figma), around their forms. */
const crumb = (section: string, sectionHref: string | null, page: string) => (
  <p className={`${TYPE.cap} text-muted-fg`}>
    {sectionHref ? (
      <SiteLink href={sectionHref} className="hover:underline">
        {section}
      </SiteLink>
    ) : (
      section
    )}
    {page ? ` › ${page}` : null}
  </p>
);

/** A white card beside a form (Figma "Other ways to reach us", "Lost money to a scam?"). */
function SideCard({ children }: { children: React.ReactNode }) {
  return <Frost className="flex flex-col gap-3 p-5 lg:p-8">{children}</Frost>;
}

export const CONTACT = {
  hero: (
    <PageHero
      tone="paper"
      crumb={crumb("Help", href("help"), "Contact us")}
      title="Contact us."
      sub="If it’s urgent, start here. Otherwise, send us a message below."
      after={
        <div className="flex w-full flex-col gap-3 pt-1 lg:w-auto lg:flex-row">
          <ButtonLink href={href("freeze")} variant="danger" className="w-full lg:w-auto">
            Freeze my account
          </ButtonLink>
          <ButtonLink href={href("report")} variant="soft" className="w-full lg:w-auto">
            Report a scam
          </ButtonLink>
        </div>
      }
    />
  ),
  aside: (
    <SideCard>
      <h3 className={TYPE.h4}>Other ways to reach us</h3>
      <Rows
        labelWidth={120}
        items={[
          ["In the app", "Ask X, or open Help to chat with our team."],
          ["By USSD", "Freeze your account from any phone."],
        ]}
      />
    </SideCard>
  ),
};

export const COMPLAINTS = {
  hero: (
    <PageHero
      tone="paper"
      crumb={crumb("Legal", null, "")}
      title="Complaints."
      sub="Something we did wasn’t right? Tell us, and we’ll put it right where we can."
      card={
        <div className="flex flex-col gap-4">
          <h2 className={TYPE.h4}>How it works</h2>
          <Steps
            items={[
              ["Tell us", "In the app, or with the form below."],
              ["We reply within 3 days", "With a reference to track it."],
              ["We aim to resolve it within 2 weeks", "If it needs longer, we’ll tell you why."],
            ]}
          />
        </div>
      }
    />
  ),
  aside: (
    <SideCard>
      <h3 className={TYPE.h4}>Lost money to a scam?</h3>
      <p className={`${TYPE.small} text-muted-fg`}>
        Report the payment in the app first, so we can act fast. Then tell us here.
      </p>
      <ButtonLink href={href("report")} variant="soft">
        Report a scam
      </ButtonLink>
    </SideCard>
  ),
  after: (
    <Section
      tone="paper"
      id="regulator"
      title="Not happy with our answer?"
      sub="If we haven’t resolved your complaint within two weeks, or you’re not happy with the result, you can take it to the Central Bank of Nigeria’s Consumer Protection Department."
    >
      <div className="flex flex-col gap-4 lg:max-w-[820px]">
        <Rows
          labelWidth={120}
          items={[
            [
              "Email",
              <a key="e" href="mailto:cpd@cbn.gov.ng" className="text-accent hover:underline">
                cpd@cbn.gov.ng
              </a>,
            ],
            [
              "Letter",
              "The Director, Consumer Protection Department, Central Bank of Nigeria, Central Business District, Garki, Abuja",
            ],
          ]}
        />
        <Note tone="grey">
          For complaints about your personal data, you can also go to the Nigeria Data Protection
          Commission.
        </Note>
      </div>
    </Section>
  ),
};

export const CAREERS = {
  hero: (
    <PageHero
      tag="Careers"
      title="Build a new financial system with us."
      sub="We’re a small team in Nigeria, making payments that fraud can’t get into."
      after={
        <div className="flex w-full flex-col gap-3 pt-2 lg:w-auto lg:flex-row">
          <ButtonLink href="#send" variant="white" className="w-full lg:w-auto">
            Introduce yourself
          </ButtonLink>
          <ButtonLink href="/about#team" variant="outline-light" className="w-full lg:w-auto">
            Meet the team
          </ButtonLink>
        </div>
      }
    />
  ),
  values: (
    <Section tone="paper" id="how-we-work" tag="How we work" title="What we care about.">
      <Grid cols={3}>
        <Tile
          icon="stop"
          title="Stop it before it happens."
          desc="We design to prevent fraud, not to clean up after it."
        />
        <Tile
          icon="chat"
          title="Plain words."
          desc="If someone can’t understand it, we rewrite it."
        />
        <Tile
          icon="id-card"
          title="People first."
          desc="Every decision starts with the person paying."
        />
      </Grid>
    </Section>
  ),
  after: (
    <Section
      tone="blue"
      id="team"
      title="See who you’d work with."
      sub="Meet the team, and read why Cyber X exists."
      rosetteAt={[0.82, 0.6]}
    >
      <div className="flex w-full flex-col gap-3 pt-2 lg:w-auto lg:flex-row">
        <ButtonLink href="/about#team" variant="white" className="w-full lg:w-auto">
          Meet the team
        </ButtonLink>
        <ButtonLink href={href("about")} variant="outline-light" className="w-full lg:w-auto">
          About Cyber X
        </ButtonLink>
      </div>
    </Section>
  ),
};
