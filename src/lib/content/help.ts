import { z } from "zod";

import { actions, checkRelated, checkSlug, describe, isoDate, list } from "./common";
import { parseDocument, plainText, readingMinutes, type Block } from "./markdown";
import { search, suggest, type Searchable } from "./search";
import { HELP_TOPIC_KEYS, type Action, type HelpTopic } from "./topics";

/**
 * Help articles (W8.1): one file per question in content/help. Adding a
 * file adds it to its topic, search and the related lists.
 */
const ARTICLE = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  topic: z.enum(HELP_TOPIC_KEYS as [HelpTopic, ...HelpTopic[]]),
  updated: isoDate,
  popular: z.coerce.number().int().positive().optional(),
  buttons: actions,
  related: list,
});

export interface Article {
  slug: string;
  title: string;
  summary: string;
  topic: HelpTopic;
  updated: string;
  popular?: number;
  actions: Action[];
  related: string[];
  blocks: Block[];
  minutes: number;
}

export function buildArticles(files: readonly { slug: string; source: string }[]): Article[] {
  const articles = files.map(({ slug, source }) => {
    checkSlug(slug, "help");
    const { data, blocks } = parseDocument(source);
    const parsed = ARTICLE.safeParse(data);
    if (!parsed.success) throw describe(parsed.error, `content/help/${slug}.md`);
    const { buttons, ...rest } = parsed.data;
    return {
      ...rest,
      slug,
      actions: buttons,
      blocks,
      minutes: readingMinutes(blocks),
    } satisfies Article;
  });
  checkRelated(articles, "help");
  return articles;
}

/** Most asked first (the "popular" number), for the Help centre. */
export function popularArticles(articles: readonly Article[]): Article[] {
  return articles.filter((a) => a.popular).sort((a, b) => a.popular! - b.popular!);
}

export const articlesInTopic = (articles: readonly Article[], topic: HelpTopic) =>
  articles.filter((article) => article.topic === topic);

/** The article's own picks first, then its topic. */
export function relatedArticles(
  articles: readonly Article[],
  article: Article,
  count = 3,
): Article[] {
  const picked = article.related.map((slug) => articles.find((other) => other.slug === slug)!);
  const rest = articlesInTopic(articles, article.topic).filter(
    (other) => other !== article && !picked.includes(other),
  );
  return [...picked, ...rest].slice(0, count);
}

/** Topic names aren't searched: "Add and withdraw" would match every article in it. */
function searchable(articles: readonly Article[]): Searchable[] {
  return articles.map((article) => ({
    id: article.slug,
    fields: [
      { text: article.title, weight: 4 },
      { text: article.summary, weight: 3 },
      { text: plainText(article.blocks), weight: 1 },
    ],
  }));
}

export function searchArticles(articles: readonly Article[], query: string): Article[] {
  return search(searchable(articles), query).map((slug) =>
    articles.find((article) => article.slug === slug)!,
  );
}

export const suggestForArticles = (articles: readonly Article[], query: string) =>
  suggest(searchable(articles), query);
