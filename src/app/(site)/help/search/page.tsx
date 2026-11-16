import type { Metadata } from "next";

import { ArticleRow, Crumbs, DidYouMean, ResultList } from "@/components/content/Parts";
import { SearchBox } from "@/components/content/SearchBox";
import { PageHero, Section, TYPE } from "@/components/kit/Kit";
import { ArrowLink } from "@/components/site/Button";
import { popularArticles, searchArticles, suggestForArticles } from "@/lib/content/help";
import { getArticles } from "@/lib/content/load";
import { readQuery } from "@/lib/content/query";
import { href } from "@/lib/site/routes";

export const metadata: Metadata = {
  title: "Search Help",
  robots: { index: false },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** W8.4, Figma Help search results and No results. */
export default async function HelpSearchPage({ searchParams }: Props) {
  const query = readQuery((await searchParams).q);
  const articles = getArticles();
  const results = query ? searchArticles(articles, query) : [];
  const suggestion = query && !results.length ? suggestForArticles(articles, query) : null;
  const action = `${href("help")}/search`;
  const popular = popularArticles(articles).slice(0, 4);

  return (
    <>
      <PageHero
        tone="paper"
        crumb={<Crumbs items={[["Help", href("help")], ["Search"]]} />}
        title="How can we help?"
        after={
          <SearchBox
            action={action}
            label="Search Help"
            placeholder="Try “withdraw to my bank”"
            query={query}
          />
        }
      />
      {query && results.length ? (
        <Section
          id="results"
          title={`${results.length} ${results.length === 1 ? "result" : "results"} for “${query}”`}
        >
          <ResultList>
            {results.map((article) => (
              <ArticleRow key={article.slug} article={article} topic />
            ))}
          </ResultList>
          <ArrowLink href={href("contact")} className="self-start">
            Can’t find it? Contact us
          </ArrowLink>
        </Section>
      ) : (
        <Section id="results" title={query ? `No results for “${query}”` : "Popular questions"}>
          {suggestion ? <DidYouMean suggestion={suggestion} action={action} /> : null}
          {query ? <h3 className={TYPE.h4}>Popular questions</h3> : null}
          <ResultList>
            {popular.map((article) => (
              <ArticleRow key={article.slug} article={article} summary={false} />
            ))}
          </ResultList>
          <ArrowLink href={href("contact")} className="self-start">
            Talk to a person
          </ArrowLink>
        </Section>
      )}
    </>
  );
}
