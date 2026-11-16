import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildPosts,
  featuredPost,
  latestPosts,
  popularPosts,
  postMeta,
  postsInTopic,
  relatedPosts,
  searchPosts,
  suggestForPosts,
  videoPosts,
} from "./blog";
import { cached } from "./files";
import {
  articlesInTopic,
  buildArticles,
  popularArticles,
  relatedArticles,
  searchArticles,
  suggestForArticles,
} from "./help";
import { getArticles, getPosts } from "./load";
import { formatDate, parseDocument, parseInline, plainText, readingMinutes } from "./markdown";
import { readQuery } from "./query";
import { distance, queryTerms, search, stem, suggest, words } from "./search";
import { BLOG_TOPIC_KEYS, HELP_TOPIC_KEYS } from "./topics";

const post = (slug: string, details: Record<string, string>, body = "Some words.") => ({
  slug,
  source: `---\n${Object.entries({
    title: `Post ${slug}`,
    excerpt: "An excerpt.",
    topic: "safety",
    author: "ifeoma",
    date: "2026-11-01",
    cover: "blue",
    icon: "flag",
    ...details,
  })
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n")}\n---\n${body}\n`,
});

const article = (slug: string, details: Record<string, string>, body = "An answer.") => ({
  slug,
  source: `---\n${Object.entries({
    title: `Question ${slug}?`,
    summary: "A summary.",
    topic: "security",
    updated: "2026-11-14",
    ...details,
  })
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n")}\n---\n${body}\n`,
});

describe("reading a file", () => {
  it("reads the details and every kind of part", () => {
    const { data, blocks } = parseDocument(
      [
        "---",
        "title: How do I freeze my account?",
        "",
        "topic: security",
        "---",
        "The lead, with a [link](/freeze).",
        "",
        "## A heading",
        "",
        "> A blue",
        "> note.",
        "",
        "> ! An amber note.",
        "",
        ">! Also amber.",
        "",
        "1. First. :: What it means.",
        "2. Second.",
        "",
        "- 0:40 :: What the seller sees",
        "",
        "- A bullet",
        "- [Another](https://example.com)",
      ].join("\r\n"),
    );
    expect(data).toEqual({ title: "How do I freeze my account?", topic: "security" });
    expect(blocks.map((block) => block.kind)).toEqual([
      "paragraph",
      "heading",
      "note",
      "note",
      "note",
      "steps",
      "rows",
      "list",
    ]);
    expect(blocks[2]).toEqual({ kind: "note", tone: "blue", content: [{ text: "A blue note." }] });
    expect(blocks[3]).toMatchObject({ tone: "amber", content: [{ text: "An amber note." }] });
    expect(blocks[4]).toMatchObject({ tone: "amber" });
    expect(blocks[5]).toEqual({
      kind: "steps",
      items: [
        { title: [{ text: "First." }], text: [{ text: "What it means." }] },
        { title: [{ text: "Second." }] },
      ],
    });
    expect(plainText(blocks)).toContain("What the seller sees");
    expect(plainText(blocks)).toContain("Another");
  });

  it("keeps links to this website or https only", () => {
    expect(parseInline("Go to [Freeze](/freeze) now")).toEqual([
      { text: "Go to " },
      { text: "Freeze", href: "/freeze" },
      { text: " now" },
    ]);
    expect(parseInline("[Top](#top)")).toEqual([{ text: "Top", href: "#top" }]);
    expect(() => parseInline("[bad](javascript:alert(1))")).toThrow(/Links may only go/);
    expect(() => parseInline("[plain](http://example.com)")).toThrow();
  });

  it("refuses a file without details", () => {
    expect(() => parseDocument("No details here.")).toThrow(/start with its details/);
    expect(() => parseDocument("---\nno colon\n---\nText")).toThrow(/needs a name and a value/);
  });

  it("works out reading time and dates", () => {
    const { blocks } = parseDocument(`---\na: b\n---\n${"word ".repeat(401)}`);
    expect(readingMinutes(blocks)).toBe(3);
    expect(readingMinutes([])).toBe(1);
    expect(formatDate("2026-11-14")).toBe("14 Nov 2026");
    expect(formatDate("2026-01-02", true)).toBe("2 January 2026");
  });
});

describe("search", () => {
  it("splits words the same way for the files and the search", () => {
    expect(words("What’s CAFÉ ₦50,000?")).toEqual(["whats", "cafe", "₦50", "000"]);
    expect(queryTerms("How do I withdraw to my bank?")).toEqual(["withdraw", "bank"]);
    expect(queryTerms("how do I")).toEqual(["how", "do", "i"]);
    expect(stem("freezing")).toBe("freez");
    expect(stem("fees")).toBe("fee");
    expect(stem("pin")).toBe("pin");
  });

  it("needs every word, and ranks the title first", () => {
    const items = [
      {
        id: "body",
        fields: [
          { text: "Nothing", weight: 4 },
          { text: "withdraw here", weight: 1 },
        ],
      },
      {
        id: "title",
        fields: [
          { text: "Withdrawals", weight: 4 },
          { text: "", weight: 1 },
        ],
      },
      { id: "x", fields: [{ text: "Meet X", weight: 4 }] },
    ];
    expect(search(items, "withdraw")).toEqual(["title", "body"]);
    expect(search(items, "withdraw bank")).toEqual([]);
    expect(search(items, "x")).toEqual(["x"]);
    expect(search(items, "   ")).toEqual([]);
  });

  it("counts a swap of two letters as one slip", () => {
    expect(distance("wirhdraw", "withdraw")).toBe(1);
    expect(distance("frezee", "freeze")).toBe(1);
    expect(distance("", "abc")).toBe(3);
  });

  it("suggests a word only when it finds something", () => {
    const items = [{ id: "a", fields: [{ text: "How do I withdraw to my bank?", weight: 4 }] }];
    expect(suggest(items, "wirhdraw")).toBe("withdraw");
    expect(suggest(items, "withdraw")).toBeNull();
    expect(suggest(items, "zzzz")).toBeNull();
    expect(suggest(items, "bnak wirhdraw")).toBe("bank withdraw");
  });

  it("reads one search from the address", () => {
    expect(readQuery("  scam ")).toBe("scam");
    expect(readQuery(["a", "b"])).toBe("a");
    expect(readQuery([])).toBe("");
    expect(readQuery(undefined)).toBe("");
    expect(readQuery("x".repeat(150))).toHaveLength(100);
  });
});

describe("blog posts", () => {
  it("adds a post for every file, newest first", () => {
    const posts = buildPosts([
      post("old", { date: "2026-10-01" }),
      post("new", { date: "2026-11-10", featured: "yes", buttons: "report, check" }),
      post("film", { date: "2026-11-05", video: "2:40", topic: "product", popular: "1" }),
    ]);
    expect(posts.map((p) => p.slug)).toEqual(["new", "film", "old"]);
    expect(posts[0]).toMatchObject({ featured: true, actions: ["report", "check"], minutes: 1 });
    expect(featuredPost(posts)?.slug).toBe("new");
    expect(latestPosts(posts).map((p) => p.slug)).toEqual(["old"]);
    expect(videoPosts(posts).map((p) => p.slug)).toEqual(["film"]);
    expect(postsInTopic(posts, "product").map((p) => p.slug)).toEqual(["film"]);
    expect(popularPosts(posts, 2).map((p) => p.slug)).toEqual(["film", "new"]);
    expect(postMeta(posts[1]!, formatDate)).toBe("5 Nov 2026 · Video, 2:40");
    expect(postMeta(posts[2]!, formatDate)).toBe("1 Oct 2026 · 1 min read");
    expect(featuredPost(buildPosts([post("only", {})]))?.slug).toBe("only");
    expect(featuredPost([])).toBeUndefined();
  });

  it("shows the post's own picks first, then its topic", () => {
    const posts = buildPosts([
      post("a", { related: "c" }),
      post("b", {}),
      post("c", { topic: "money" }),
      post("d", { topic: "money" }),
    ]);
    const [a] = posts.filter((p) => p.slug === "a");
    expect(relatedPosts(posts, a!).map((p) => p.slug)).toEqual(["c", "b", "d"]);
  });

  it("explains what's wrong with a bad file", () => {
    expect(() => buildPosts([post("a", { topic: "gossip" })])).toThrow(
      /content\/blog\/a\.md: topic/,
    );
    expect(() => buildPosts([post("a", { date: "14/11/2026" })])).toThrow(/2026-11-14/);
    expect(() => buildPosts([post("a", { date: "2026-13-45" })])).toThrow(/real date/);
    expect(() => buildPosts([post("a", { video: "long" })])).toThrow(/2:40/);
    expect(() => buildPosts([post("a", { buttons: "share" })])).toThrow();
    expect(() => buildPosts([post("Bad Name", {})])).toThrow(/lower-case/);
    expect(() => buildPosts([post("search", {})])).toThrow(/search/);
    expect(() => buildPosts([post("a", { related: "ghost" })])).toThrow(/related "ghost"/);
    expect(() => buildPosts([post("a", { related: "a" })])).toThrow(/related "a"/);
    expect(() =>
      buildPosts([post("a", { featured: "yes" }), post("b", { featured: "yes" })]),
    ).toThrow(/only one post/);
  });

  it("searches posts and suggests a spelling", () => {
    const posts = buildPosts([
      post("scams", { title: "Five scams" }),
      post("x", { title: "Meet X" }),
    ]);
    expect(searchPosts(posts, "scam").map((p) => p.slug)).toEqual(["scams"]);
    expect(suggestForPosts(posts, "scma")).toBeNull();
    expect(suggestForPosts(posts, "scams")).toBeNull();
  });
});

describe("help articles", () => {
  it("adds an article for every file", () => {
    const articles = buildArticles([
      article("a", { popular: "2", related: "c" }),
      article("b", { popular: "1", buttons: "freeze" }),
      article("c", { topic: "paying" }),
      article("d", {}),
    ]);
    expect(popularArticles(articles).map((a) => a.slug)).toEqual(["b", "a"]);
    expect(articlesInTopic(articles, "paying").map((a) => a.slug)).toEqual(["c"]);
    expect(relatedArticles(articles, articles[0]!).map((a) => a.slug)).toEqual(["c", "b", "d"]);
    expect(articles[1]!.actions).toEqual(["freeze"]);
    expect(() => buildArticles([article("a", { topic: "nope" })])).toThrow(/content\/help\/a\.md/);
    expect(() => buildArticles([article("a", { related: "zz" })])).toThrow(/related "zz"/);
  });
});

describe("the real files", () => {
  const posts = getPosts();
  const articles = getArticles();

  it("all load, and every topic has something in it", () => {
    expect(posts.length).toBeGreaterThanOrEqual(7);
    expect(articles.length).toBeGreaterThanOrEqual(20);
    for (const topic of BLOG_TOPIC_KEYS)
      expect(postsInTopic(posts, topic).length).toBeGreaterThan(0);
    for (const topic of HELP_TOPIC_KEYS) {
      expect(articlesInTopic(articles, topic).length).toBeGreaterThan(0);
    }
    expect(popularArticles(articles)).toHaveLength(6);
  });

  it("filters the blog by Safety (Figma Blog topic)", () => {
    expect(
      postsInTopic(posts, "safety")
        .map((p) => p.slug)
        .sort(),
    ).toEqual(["check-a-payment-alert", "five-scams", "lost-your-phone"]);
  });

  it("finds the withdraw articles, and fixes “wirhdraw” (W8.4)", () => {
    expect(
      searchArticles(articles, "withdraw")
        .map((a) => a.title)
        .sort(),
    ).toEqual([
      "Can I withdraw to someone else’s account?",
      "Do withdrawals count towards my daily limit?",
      "How do I withdraw to my bank?",
      "What does it cost to withdraw?",
    ]);
    expect(searchArticles(articles, "wirhdraw")).toEqual([]);
    expect(suggestForArticles(articles, "wirhdraw")).toBe("withdraw");
    expect(searchPosts(posts, "refnd")).toEqual([]);
    expect(suggestForPosts(posts, "refnd")).toBeNull();
  });
});

describe("reading the files once", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("keeps what it read in production, and reads again while working", () => {
    const load = vi.fn(() => Math.random());
    vi.stubEnv("NODE_ENV", "production");
    const get = cached(load);
    expect(get()).toBe(get());
    expect(load).toHaveBeenCalledTimes(1);
    vi.stubEnv("NODE_ENV", "development");
    get();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
