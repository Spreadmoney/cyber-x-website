import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleBody } from "@/components/content/ArticleBody";
import { Cover } from "@/components/content/Cover";
import { CopyLink } from "@/components/content/Interactive";
import {
  Actions,
  Author,
  Crumbs,
  PostCard,
  SampleNote,
  blogTopicHref,
} from "@/components/content/Parts";
import { Cta, Grid, Section, TYPE, VideoSlot } from "@/components/kit/Kit";
import { Tag, WRAP } from "@/components/site/Panel";
import { postMeta, relatedPosts } from "@/lib/content/blog";
import { getPosts } from "@/lib/content/load";
import { formatDate } from "@/lib/content/markdown";
import { BLOG_TOPICS } from "@/lib/content/topics";
import { readAddresses } from "@/lib/env/addresses";
import { href } from "@/lib/site/routes";

type Props = { params: Promise<{ slug: string }> };

const find = async (params: Props["params"]) => {
  const { slug } = await params;
  return getPosts().find((post) => post.slug === slug);
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await find(params);
  return post ? { title: post.title, description: post.excerpt } : {};
}

/** A blog post or a video post (Figma Blog article, Blog video post). */
export default async function PostPage({ params }: Props) {
  const post = await find(params);
  if (!post) notFound();
  const { appUrl } = readAddresses();
  const topic = BLOG_TOPICS[post.topic];
  const related = relatedPosts(getPosts(), post);
  return (
    <>
      <article
        aria-labelledby="page-title"
        className={`${WRAP} flex flex-col gap-6 pt-6 pb-10 lg:gap-12 lg:pt-14 lg:pb-20`}
      >
        <header className="flex max-w-[820px] flex-col items-start gap-3 lg:gap-4">
          <Crumbs
            items={[
              ["Blog", href("blog")],
              [topic.name, blogTopicHref(post.topic)],
            ]}
          />
          <div className="flex gap-2">
            <Tag tone="paper">{topic.name}</Tag>
            {post.video ? <Tag tone="paper">Video</Tag> : null}
          </div>
          <h1 id="page-title" className={TYPE.h2}>
            {post.title}
          </h1>
          <Author author={post.author} meta={postMeta(post, (iso) => formatDate(iso))} large />
        </header>
        {post.video ? (
          <VideoSlot title={post.title} length={post.video} />
        ) : (
          <Cover
            kind={post.cover}
            icon={post.icon}
            size="article"
            className="rounded-[20px] lg:rounded-[28px]"
          />
        )}
        <div className="flex max-w-[720px] flex-col gap-5 lg:gap-6">
          <ArticleBody blocks={post.blocks} />
          <Actions actions={post.actions} />
          <CopyLink />
          <SampleNote>Sample post for the demo. The author is one of our sample team.</SampleNote>
        </div>
      </article>

      {related.length ? (
        <Section
          tone="paper"
          id="more"
          title={post.video ? "Keep watching" : "Keep reading"}
          rosetteAt={[0.92, 0.2]}
        >
          <Grid cols={3}>
            {related.map((other) => (
              <PostCard key={other.slug} post={other} />
            ))}
          </Grid>
        </Section>
      ) : null}

      <Cta appUrl={appUrl} />
    </>
  );
}
