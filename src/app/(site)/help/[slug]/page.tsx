import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleBody } from "@/components/content/ArticleBody";
import { Helpful } from "@/components/content/Interactive";
import { Actions, ArticleRow, Crumbs, ResultList, helpTopicHref } from "@/components/content/Parts";
import { Section, TYPE } from "@/components/kit/Kit";
import { ArrowLink } from "@/components/site/Button";
import { WRAP } from "@/components/site/Panel";
import { relatedArticles } from "@/lib/content/help";
import { getArticles } from "@/lib/content/load";
import { formatDate } from "@/lib/content/markdown";
import { HELP_TOPICS } from "@/lib/content/topics";
import { href } from "@/lib/site/routes";

type Props = { params: Promise<{ slug: string }> };

const find = async (params: Props["params"]) => {
  const { slug } = await params;
  return getArticles().find((article) => article.slug === slug);
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await find(params);
  return article ? { title: article.title, description: article.summary } : {};
}

/** W8.3, Figma Help article. */
export default async function HelpArticlePage({ params }: Props) {
  const article = await find(params);
  if (!article) notFound();
  const related = relatedArticles(getArticles(), article);
  return (
    <>
      <article aria-labelledby="page-title" className={`${WRAP} pt-6 pb-10 lg:pt-14 lg:pb-20`}>
        <div className="flex max-w-[720px] flex-col gap-3.5 lg:gap-[18px]">
          <Crumbs
            items={[
              ["Help", href("help")],
              [HELP_TOPICS[article.topic].name, helpTopicHref(article.topic)],
            ]}
          />
          <h1 id="page-title" className={TYPE.h2}>
            {article.title}
          </h1>
          <p className={`${TYPE.cap} text-muted-fg`}>
            Updated {formatDate(article.updated, true)} · {article.minutes} min read
          </p>
          <ArticleBody blocks={article.blocks} />
          <Actions actions={article.actions} />
          <div className="pt-2">
            <Helpful contactHref={href("contact")} />
          </div>
        </div>
      </article>

      {related.length ? (
        <Section tone="paper" id="related" title="Related" rosetteAt={[0.92, 0.4]}>
          <ResultList>
            {related.map((other) => (
              <ArticleRow key={other.slug} article={other} />
            ))}
          </ResultList>
          <ArrowLink href={href("contact")} className="self-start">
            Contact us
          </ArrowLink>
        </Section>
      ) : null}
    </>
  );
}
