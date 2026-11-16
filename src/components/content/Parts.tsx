import Image from "next/image";
import type { ReactNode } from "react";

import { TYPE } from "@/components/kit/Kit";
import { ButtonLink } from "@/components/site/Button";
import { Tag } from "@/components/site/Panel";
import { SiteLink } from "@/components/site/SiteLink";
import { TEAM, photoOf, type TeamKey } from "@/content/team";
import { postMeta, type Post } from "@/lib/content/blog";
import type { Article } from "@/lib/content/help";
import { formatDate } from "@/lib/content/markdown";
import {
  ACTIONS,
  BLOG_TOPICS,
  BLOG_TOPIC_KEYS,
  HELP_TOPICS,
  type Action,
  type BlogTopic,
} from "@/lib/content/topics";
import { href } from "@/lib/site/routes";

import { Cover } from "./Cover";

/** Where a post or article lives. */
export const postHref = (post: Post) => `${href("blog")}/${post.slug}`;
export const articleHref = (article: Article) => `${href("help")}/${article.slug}`;
export const blogTopicHref = (topic: BlogTopic) => `${href("blog")}/topic/${topic}`;
export const helpTopicHref = (topic: string) => `${href("help")}/topic/${topic}`;

/** "Blog › Safety", with each step a link but the last. */
export function Crumbs({
  items,
  dark,
}: {
  items: readonly (readonly [string, string?])[];
  dark?: boolean;
}) {
  return (
    <nav aria-label="Breadcrumb">
      <ol
        className={`flex flex-wrap items-center gap-1.5 ${TYPE.cap} ${dark ? "text-white/82" : "text-muted-fg"}`}
      >
        {items.map(([label, link], index) => (
          <li key={label} className="flex items-center gap-1.5">
            {index > 0 ? <span aria-hidden="true">›</span> : null}
            {link ? (
              <SiteLink href={link} className="hover:underline">
                {label}
              </SiteLink>
            ) : (
              <span aria-current="page">{label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** The author's sample photo, name and the post's date (Figma AUTHOR). */
export function Author({
  author,
  meta,
  large,
}: {
  author: TeamKey;
  meta: string;
  large?: boolean;
}) {
  const person = TEAM[author];
  const size = large ? 44 : 28;
  return (
    <div className="relative flex items-center gap-2.5">
      <Image
        src={photoOf(author)}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
      <span className="flex flex-col">
        <span className={large ? TYPE.h4 : TYPE.small}>
          {person.name}
          {large ? `, ${person.role}` : ""}
        </span>
        <span className={`${TYPE.cap} text-muted-fg`}>{meta}</span>
      </span>
    </div>
  );
}

const shortDate = (iso: string) => formatDate(iso);

/** A post as a card (Figma POST). The title's link covers the whole card. */
export function PostCard({
  post,
  featured,
  excerpt,
  as: Tag_ = "li",
}: {
  post: Post;
  featured?: boolean;
  excerpt?: boolean;
  as?: "li" | "div";
}) {
  const Heading = featured ? "h2" : "h3";
  return (
    <Tag_
      className={`group border-line relative flex flex-col overflow-hidden rounded-[20px] border bg-white shadow-[0_8px_24px_rgb(10_19_56/0.06)] transition-shadow hover:shadow-[0_12px_32px_rgb(10_19_56/0.12)] lg:rounded-[24px] ${featured ? "lg:flex-row lg:items-stretch" : ""}`}
    >
      <Cover
        kind={post.cover}
        icon={post.icon}
        video={post.video}
        size={featured ? "feature" : "card"}
        className={featured ? "lg:w-[560px]" : ""}
      />
      <div
        className={`flex flex-col items-start gap-2 p-[18px] pb-5 lg:gap-2.5 lg:px-[22px] lg:pt-5 lg:pb-6 ${featured ? "lg:justify-center lg:px-10 lg:py-8" : ""}`}
      >
        <div className="flex gap-2">
          <Tag tone="paper">{BLOG_TOPICS[post.topic].name}</Tag>
          {post.video ? <Tag tone="paper">Video</Tag> : null}
        </div>
        {/* The featured post comes straight after the page title: a level-2 heading. */}
        <Heading className={featured ? TYPE.h3 : TYPE.h4}>
          <SiteLink
            href={postHref(post)}
            className="focus-visible:outline-accent rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {post.title}
          </SiteLink>
        </Heading>
        {featured || excerpt ? <p className={`${TYPE.p} text-muted-fg`}>{post.excerpt}</p> : null}
        <div className="pt-1">
          <Author author={post.author} meta={postMeta(post, shortDate)} />
        </div>
      </div>
    </Tag_>
  );
}

/** A post in search results (Figma RESULT). */
export function PostResult({ post }: { post: Post }) {
  return (
    <li className="relative flex items-center gap-3.5 border-t border-[rgb(10_19_56/0.1)] py-3.5 lg:gap-6 lg:py-5">
      <Cover
        kind={post.cover}
        icon={post.icon}
        size="thumb"
        className="rounded-[12px] lg:rounded-[14px]"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p className={`${TYPE.cap} text-accent`}>
          {BLOG_TOPICS[post.topic].name}
          {post.video ? " · Video" : ""}
        </p>
        <h3 className={TYPE.h4}>
          <SiteLink
            href={postHref(post)}
            className="focus-visible:outline-accent rounded-sm after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {post.title}
          </SiteLink>
        </h3>
        <p className={`hidden ${TYPE.small} text-muted-fg lg:block`}>{post.excerpt}</p>
        <p className={`${TYPE.cap} text-muted-fg`}>{postMeta(post, shortDate)}</p>
      </div>
    </li>
  );
}

/** A help article in a list (Figma HROW): the whole row is the link. */
export function ArticleRow({
  article,
  topic,
  summary = true,
}: {
  article: Article;
  topic?: boolean;
  summary?: boolean;
}) {
  return (
    <li className="border-t border-[rgb(10_19_56/0.1)]">
      <SiteLink
        href={articleHref(article)}
        className="group focus-visible:outline-accent flex items-center gap-4 rounded-sm py-4 focus-visible:outline-2 focus-visible:outline-offset-2 lg:py-5"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          {topic ? (
            <span className={`${TYPE.cap} text-accent`}>{HELP_TOPICS[article.topic].name}</span>
          ) : null}
          <span className={`${TYPE.h4} group-hover:underline`}>{article.title}</span>
          {summary ? (
            <span className={`${TYPE.small} text-muted-fg`}>{article.summary}</span>
          ) : null}
        </span>
        <span aria-hidden="true" className={`${TYPE.h3} text-accent`}>
          ›
        </span>
      </SiteLink>
    </li>
  );
}

/** Topic chips (Figma CHIPS): links, so each topic has its own address. */
export function TopicChips({
  current,
  dark,
  all = true,
}: {
  current?: BlogTopic | "all";
  dark?: boolean;
  all?: boolean;
}) {
  const chips: [string, string, BlogTopic | "all"][] = [
    ...(all ? [["All", href("blog"), "all"] as [string, string, "all"]] : []),
    ...BLOG_TOPIC_KEYS.map(
      (key) => [BLOG_TOPICS[key].name, blogTopicHref(key), key] as [string, string, BlogTopic],
    ),
  ];
  return (
    <nav aria-label="Blog topics">
      <ul className="flex flex-wrap gap-2">
        {chips.map(([label, link, key]) => {
          const on = key === current;
          const look = on
            ? dark
              ? "bg-white text-deep"
              : "bg-accent text-white"
            : dark
              ? "border border-white/50 bg-white/14 text-white hover:bg-white/24"
              : "border border-[#d5dce8] bg-white text-fg hover:border-fg/40";
          return (
            <li key={key}>
              <SiteLink
                href={link}
                aria-current={on ? "page" : undefined}
                className={`inline-flex min-h-9 items-center rounded-full px-4 ${TYPE.lab} focus-visible:outline-2 focus-visible:outline-offset-2 ${dark ? "focus-visible:outline-white" : "focus-visible:outline-accent"} ${look}`}
              >
                {label}
              </SiteLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** The buttons at the end of a post or article. Freeze is always red. */
export function Actions({ actions }: { actions: readonly Action[] }) {
  if (!actions.length) return null;
  return (
    <div className="flex flex-col gap-3 pt-2 lg:flex-row">
      {actions.map((key, index) => (
        <ButtonLink
          key={key}
          href={ACTIONS[key].href()}
          variant={key === "freeze" ? "danger" : index === 0 ? "primary" : "secondary"}
          className="w-full lg:w-auto"
        >
          {ACTIONS[key].label}
        </ButtonLink>
      ))}
    </div>
  );
}

/** "Did you mean withdraw?" */
export function DidYouMean({ suggestion, action }: { suggestion: string; action: string }) {
  return (
    <p className={`${TYPE.p} text-muted-fg`}>
      Did you mean{" "}
      <SiteLink
        href={`${action}?q=${encodeURIComponent(suggestion)}`}
        className="text-accent font-medium hover:underline"
      >
        {suggestion}
      </SiteLink>
      ?
    </p>
  );
}

export function ResultList({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <ul className={`border-b border-[rgb(10_19_56/0.1)] ${wide ? "" : "lg:max-w-[820px]"}`}>
      {children}
    </ul>
  );
}

/** The line that marks sample content for the demo. */
export function SampleNote({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return <p className={`${TYPE.cap} ${dark ? "text-white/82" : "text-muted-fg"}`}>{children}</p>;
}
