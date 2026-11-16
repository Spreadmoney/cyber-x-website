import type { Metadata } from "next";

import { PostCard, SampleNote, TopicChips } from "@/components/content/Parts";
import { SearchBox } from "@/components/content/SearchBox";
import { Cta, Grid, PageHero, Section } from "@/components/kit/Kit";
import { featuredPost, latestPosts, videoPosts } from "@/lib/content/blog";
import { getPosts } from "@/lib/content/load";
import { readAddresses } from "@/lib/env/addresses";

export const metadata: Metadata = {
  title: "Blog",
  description: "Guides, product news and the thinking behind Cyber X.",
};

export default function BlogPage() {
  const { appUrl } = readAddresses();
  const posts = getPosts();
  const featured = featuredPost(posts);
  const latest = latestPosts(posts);
  const videos = videoPosts(posts);
  return (
    <>
      <PageHero
        tag="Blog"
        title="Notes on money, trust and fraud."
        sub="Guides, product news and the thinking behind Cyber X. For people who pay, and for the people who build with us."
        after={
          <>
            <SearchBox
              action="/blog/search"
              label="Search the blog"
              placeholder="Search the blog"
            />
            <TopicChips current="all" dark />
            <SampleNote dark>Sample posts for the demo, by our sample team.</SampleNote>
          </>
        }
      />

      {featured ? (
        <Section id="featured" tag="Featured">
          <PostCard post={featured} featured as="div" />
        </Section>
      ) : null}

      {latest.length ? (
        <Section tone="paper" id="latest" title="Latest" rosetteAt={[0.92, 0.15]}>
          <Grid cols={3}>
            {latest.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </Grid>
        </Section>
      ) : null}

      {videos.length ? (
        <Section id="watch" title="Watch" sub="Short films on how Cyber X works.">
          <Grid cols={2}>
            {videos.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </Grid>
        </Section>
      ) : null}

      <Cta appUrl={appUrl} title="Put it into practice." />
    </>
  );
}
