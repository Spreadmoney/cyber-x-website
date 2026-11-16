import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleRow, Crumbs, ResultList } from "@/components/content/Parts";
import { SearchBox } from "@/components/content/SearchBox";
import { PageHero, Section } from "@/components/kit/Kit";
import { ArrowLink } from "@/components/site/Button";
import { articlesInTopic } from "@/lib/content/help";
import { getArticles } from "@/lib/content/load";
import { HELP_TOPICS, type HelpTopic } from "@/lib/content/topics";
import { href } from "@/lib/site/routes";

type Props = { params: Promise<{ topic: string }> };

const topicOf = (key: string) => (Object.hasOwn(HELP_TOPICS, key) ? (key as HelpTopic) : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const topic = topicOf((await params).topic);
  return topic
    ? { title: `${HELP_TOPICS[topic].name} · Help`, description: HELP_TOPICS[topic].desc }
    : {};
}

/** A topic's articles ("See articles" on the Help centre). Not drawn in Figma: built from its parts. */
export default async function HelpTopicPage({ params }: Props) {
  const topic = topicOf((await params).topic);
  if (!topic) notFound();
  const articles = articlesInTopic(getArticles(), topic);
  const { name, desc } = HELP_TOPICS[topic];
  return (
    <>
      <PageHero
        tone="paper"
        crumb={<Crumbs items={[["Help", href("help")], [name]]} />}
        title={name}
        sub={desc}
        after={
          <SearchBox
            action="/help/search"
            label="Search Help"
            placeholder="Try “withdraw to my bank”"
          />
        }
      />
      <Section
        id="articles"
        title={`${articles.length} ${articles.length === 1 ? "article" : "articles"}`}
      >
        <ResultList>
          {articles.map((article) => (
            <ArticleRow key={article.slug} article={article} />
          ))}
        </ResultList>
        <ArrowLink href={href("contact")} className="self-start">
          Can’t find it? Contact us
        </ArrowLink>
      </Section>
    </>
  );
}
