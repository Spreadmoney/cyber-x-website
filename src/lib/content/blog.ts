import { z } from "zod";

import { TEAM, TEAM_KEYS, type TeamKey } from "@/content/team";

import { actions, checkRelated, checkSlug, describe, isoDate, list } from "./common";
import { parseDocument, plainText, readingMinutes, type Block } from "./markdown";
import { search, suggest, type Searchable } from "./search";
import {
  BLOG_TOPICS,
  BLOG_TOPIC_KEYS,
  COVER_ICONS,
  type Action,
  type BlogTopic,
  type CoverIcon,
  type CoverKind,
} from "./topics";

/**
 * Blog posts (W8.1): one file per post in content/blog. Adding a file adds
 * the post to the blog, its topic, search and "Keep reading".
 */
const POST = z.object({
  title: z.string().min(1),
  excerpt: z.string().min(1),
  topic: z.enum(BLOG_TOPIC_KEYS as [BlogTopic, ...BlogTopic[]]),
  author: z.enum(TEAM_KEYS as [TeamKey, ...TeamKey[]]),
  date: isoDate,
  cover: z.enum(["blue", "deep", "paper"]),
  icon: z.enum(COVER_ICONS),
  video: z
    .string()
    .regex(/^\d{1,2}:\d{2}$/, "Write a video's length as 2:40.")
    .optional(),
  featured: z.enum(["yes", "no"]).optional(),
  popular: z.coerce.number().int().positive().optional(),
  buttons: actions,
  related: list,
});

export interface Post {
  slug: string;
  title: string;
  excerpt: string;
  topic: BlogTopic;
  author: TeamKey;
  date: string;
  cover: CoverKind;
  icon: CoverIcon;
  video?: string;
  featured: boolean;
  popular?: number;
  actions: Action[];
  related: string[];
  blocks: Block[];
  minutes: number;
}

export function buildPosts(files: readonly { slug: string; source: string }[]): Post[] {
  const posts = files.map(({ slug, source }) => {
    checkSlug(slug, "blog");
    const { data, blocks } = parseDocument(source);
    const parsed = POST.safeParse(data);
    if (!parsed.success) throw describe(parsed.error, `content/blog/${slug}.md`);
    const { featured, buttons, ...rest } = parsed.data;
    return {
      ...rest,
      slug,
      featured: featured === "yes",
      actions: buttons,
      blocks,
      minutes: readingMinutes(blocks),
    } satisfies Post;
  });
  checkRelated(posts, "blog");
  if (posts.filter((post) => post.featured).length > 1) {
    throw new Error("content/blog: only one post can be featured.");
  }
  // Newest first; the same day keeps file order.
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

/** "14 Nov 2026 · 6 min read" or "10 Nov 2026 · Video, 2:40". */
export function postMeta(post: Post, date: (iso: string) => string): string {
  return `${date(post.date)} · ${post.video ? `Video, ${post.video}` : `${post.minutes} min read`}`;
}

export function featuredPost(posts: readonly Post[]): Post | undefined {
  return posts.find((post) => post.featured) ?? posts[0];
}

export function latestPosts(posts: readonly Post[], count = 3): Post[] {
  const featured = featuredPost(posts);
  return posts.filter((post) => !post.video && post !== featured).slice(0, count);
}

export const videoPosts = (posts: readonly Post[]) => posts.filter((post) => post.video);

export const postsInTopic = (posts: readonly Post[], topic: BlogTopic) =>
  posts.filter((post) => post.topic === topic);

/** The post's own picks first, then its topic, then the newest. */
export function relatedPosts(posts: readonly Post[], post: Post, count = 3): Post[] {
  const picked = post.related.map((slug) => posts.find((other) => other.slug === slug)!);
  const rest = [...posts.filter((other) => other.topic === post.topic), ...posts].filter(
    (other) => other !== post && !picked.includes(other),
  );
  return [...new Set([...picked, ...rest])].slice(0, count);
}

export function popularPosts(posts: readonly Post[], count = 3): Post[] {
  const ranked = posts.filter((post) => post.popular).sort((a, b) => a.popular! - b.popular!);
  return [...new Set([...ranked, ...posts])].slice(0, count);
}

function searchable(posts: readonly Post[]): Searchable[] {
  return posts.map((post) => ({
    id: post.slug,
    fields: [
      { text: post.title, weight: 4 },
      { text: post.excerpt, weight: 3 },
      { text: `${BLOG_TOPICS[post.topic].name} ${post.video ? "video" : ""}`, weight: 2 },
      { text: TEAM[post.author].name, weight: 2 },
      { text: plainText(post.blocks), weight: 1 },
    ],
  }));
}

export function searchPosts(posts: readonly Post[], query: string): Post[] {
  return search(searchable(posts), query).map((slug) => posts.find((post) => post.slug === slug)!);
}

export const suggestForPosts = (posts: readonly Post[], query: string) =>
  suggest(searchable(posts), query);
