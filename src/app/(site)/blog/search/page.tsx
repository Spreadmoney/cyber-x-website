import type { Metadata } from "next";

import { Crumbs, DidYouMean, PostResult, ResultList, TopicChips } from "@/components/content/Parts";
import { SearchBox } from "@/components/content/SearchBox";
import { PageHero, Section, TYPE } from "@/components/kit/Kit";
import { popularPosts, searchPosts, suggestForPosts } from "@/lib/content/blog";
import { getPosts } from "@/lib/content/load";
import { readQuery } from "@/lib/content/query";
import { href } from "@/lib/site/routes";

export const metadata: Metadata = {
  title: "Search the blog",
  robots: { index: false },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** W8.4, Figma Blog search results and No results. */
export default async function BlogSearchPage({ searchParams }: Props) {
  const query = readQuery((await searchParams).q);
  const posts = getPosts();
  const results = query ? searchPosts(posts, query) : [];
  const suggestion = query && !results.length ? suggestForPosts(posts, query) : null;
  const action = `${href("blog")}/search`;

  return (
    <>
      <PageHero
        tone="paper"
        crumb={<Crumbs items={[["Blog", href("blog")], ["Search"]]} />}
        title="Search the blog"
        after={
          <>
            <SearchBox
              action={action}
              label="Search the blog"
              placeholder="Search the blog"
              query={query}
            />
            <TopicChips current="all" />
          </>
        }
      />
      {!query ? (
        <Section id="results" title="Popular posts">
          <ResultList>
            {popularPosts(posts).map((post) => (
              <PostResult key={post.slug} post={post} />
            ))}
          </ResultList>
        </Section>
      ) : results.length ? (
        <Section
          id="results"
          title={`${results.length} ${results.length === 1 ? "result" : "results"} for “${query}”`}
        >
          <ResultList>
            {results.map((post) => (
              <PostResult key={post.slug} post={post} />
            ))}
          </ResultList>
        </Section>
      ) : (
        <Section
          id="results"
          title={`No posts match “${query}”.`}
          sub="Check the spelling, try a different word, or pick a topic."
        >
          {suggestion ? <DidYouMean suggestion={suggestion} action={action} /> : null}
          <TopicChips all={false} />
          <h3 className={TYPE.h4}>Popular posts</h3>
          <ResultList>
            {popularPosts(posts).map((post) => (
              <PostResult key={post.slug} post={post} />
            ))}
          </ResultList>
        </Section>
      )}
    </>
  );
}
