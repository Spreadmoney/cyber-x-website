import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Crumbs, PostCard, TopicChips } from "@/components/content/Parts";
import { Cta, Grid, PageHero, Section } from "@/components/kit/Kit";
import { postsInTopic } from "@/lib/content/blog";
import { getPosts } from "@/lib/content/load";
import { BLOG_TOPICS, type BlogTopic } from "@/lib/content/topics";
import { readAddresses } from "@/lib/env/addresses";
import { href } from "@/lib/site/routes";

type Props = { params: Promise<{ topic: string }> };

const topicOf = (key: string) => (Object.hasOwn(BLOG_TOPICS, key) ? (key as BlogTopic) : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const topic = topicOf((await params).topic);
  if (!topic) return {};
  return { title: `${BLOG_TOPICS[topic].name} · Blog`, description: BLOG_TOPICS[topic].sub };
}

export default async function BlogTopicPage({ params }: Props) {
  const topic = topicOf((await params).topic);
  if (!topic) notFound();
  const { appUrl } = readAddresses();
  const posts = postsInTopic(getPosts(), topic);
  const { name, sub, cta } = BLOG_TOPICS[topic];
  return (
    <>
      <PageHero
        tone="paper"
        crumb={<Crumbs items={[["Blog", href("blog")], [name]]} />}
        title={`${name}.`}
        sub={sub}
        after={<TopicChips current={topic} />}
      />
      <Section id="posts" title={`${posts.length} ${posts.length === 1 ? "post" : "posts"}`}>
        <Grid cols={3}>
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} excerpt />
          ))}
        </Grid>
      </Section>
      <Cta appUrl={appUrl} title={cta} />
    </>
  );
}
