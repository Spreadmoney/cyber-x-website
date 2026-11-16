import type { Metadata } from "next";

import { helpTopicHref } from "@/components/content/Parts";
import { SearchBox } from "@/components/content/SearchBox";
import { Grid, PageHero, Rows, Section, TYPE, Tile } from "@/components/kit/Kit";
import { ArrowLink, ButtonLink } from "@/components/site/Button";
import { SiteLink } from "@/components/site/SiteLink";
import { popularArticles } from "@/lib/content/help";
import { getArticles } from "@/lib/content/load";
import { HELP_TOPICS, HELP_TOPIC_KEYS } from "@/lib/content/topics";
import { href } from "@/lib/site/routes";

export const metadata: Metadata = {
  title: "Help centre",
  description: "Answers about paying, getting paid, fees, limits and keeping your account safe.",
};

/** W8.3, Figma Help centre. */
export default function HelpPage() {
  const popular = popularArticles(getArticles());
  return (
    <>
      <PageHero
        tone="paper"
        title="How can we help?"
        after={
          <>
            <SearchBox
              action="/help/search"
              label="Search Help"
              placeholder="Try “withdraw to my bank”"
            />
            <h2 className={`${TYPE.lab} text-muted-fg pt-1`}>Popular</h2>
            <ul className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:gap-x-6 lg:gap-y-3">
              {popular.map((article) => (
                <li key={article.slug}>
                  <SiteLink
                    href={`${href("help")}/${article.slug}`}
                    className={`${TYPE.p} text-accent font-medium hover:underline`}
                  >
                    {article.title}
                  </SiteLink>
                </li>
              ))}
            </ul>
          </>
        }
      />

      <Section id="urgent" tag="Urgent" title="Something wrong right now?">
        <Grid cols={3}>
          <Tile
            icon="freeze"
            title="Lost your phone?"
            desc="Freeze your account. It stops money leaving it straight away."
            action={
              <ButtonLink href={href("freeze")} variant="danger" className="w-full">
                Freeze my account
              </ButtonLink>
            }
          />
          <Tile
            icon="flag"
            title="Been scammed?"
            desc="Report it now so we can act on it."
            action={
              <ButtonLink href={href("report")} variant="secondary" className="w-full">
                Report a scam
              </ButtonLink>
            }
          />
          <Tile
            icon="check"
            title="Not sure a payment is real?"
            desc="Check it with the reference and amount."
            action={
              <ButtonLink href={href("check")} variant="secondary" className="w-full">
                Check a payment
              </ButtonLink>
            }
          />
        </Grid>
      </Section>

      <Section tone="paper" id="topics" title="Browse by topic" rosetteAt={[0.92, 0.25]}>
        <Grid cols={3}>
          {HELP_TOPIC_KEYS.map((key) => (
            <Tile
              key={key}
              icon={HELP_TOPICS[key].icon}
              title={HELP_TOPICS[key].name}
              desc={HELP_TOPICS[key].desc}
              link={{ label: "See articles", href: helpTopicHref(key) }}
            />
          ))}
        </Grid>
      </Section>

      <Section id="stuck" title="Still stuck?">
        <Rows
          items={[
            [
              "Ask X in the app",
              "X answers most questions straight away, and hands you to our team when it can’t.",
            ],
            ["Send us a message", "Use the form on our Contact page."],
          ]}
        />
        <ArrowLink href={href("contact")} className="self-start">
          Contact us
        </ArrowLink>
      </Section>
    </>
  );
}
