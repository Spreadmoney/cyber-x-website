import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/blog" }));

import { buildArticles } from "@/lib/content/help";
import { buildPosts } from "@/lib/content/blog";
import { parseDocument } from "@/lib/content/markdown";

import { ArticleBody } from "./ArticleBody";
import { Cover } from "./Cover";
import { CopyLink, Helpful } from "./Interactive";
import {
  Actions,
  ArticleRow,
  Author,
  Crumbs,
  DidYouMean,
  PostCard,
  PostResult,
  ResultList,
  SampleNote,
  TopicChips,
} from "./Parts";
import { SearchBox } from "./SearchBox";

const [film, plain] = buildPosts([
  {
    slug: "film",
    source:
      "---\ntitle: Pay me safely\nexcerpt: How it works.\ntopic: product\nauthor: zainab\ndate: 2026-11-10\ncover: deep\nicon: spark\nvideo: 2:40\n---\nWords.",
  },
  {
    slug: "plain",
    source:
      "---\ntitle: Five scams\nexcerpt: Know them.\ntopic: safety\nauthor: ifeoma\ndate: 2026-11-01\ncover: paper\nicon: flag\n---\nWords.",
  },
]);
const [help] = buildArticles([
  {
    slug: "freeze",
    source:
      "---\ntitle: How do I freeze my account?\nsummary: It stops money leaving.\ntopic: security\nupdated: 2026-11-14\n---\nWords.",
  },
]);

describe("post parts", () => {
  it("draws covers for every kind and size, with a video length", () => {
    const { container } = render(
      <>
        <Cover kind="deep" icon="spark" video="2:40" size="card" />
        <Cover kind="paper" icon="flag" size="thumb" />
        <Cover kind="blue" icon="check" size="article" />
        <Cover kind="blue" icon="bank" size="feature" />
      </>,
    );
    expect(container.querySelectorAll("[aria-hidden='true']").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("2:40")).toBeInTheDocument();
    expect(container.querySelector("svg path")).not.toBeNull();
  });

  it("links a card's title to the post, with its topic and author", () => {
    render(
      <ul>
        <PostCard post={film!} />
        <PostCard post={plain!} excerpt />
      </ul>,
    );
    expect(screen.getByRole("link", { name: "Pay me safely" })).toHaveAttribute(
      "href",
      "/blog/film",
    );
    expect(screen.getByText("Video")).toBeInTheDocument();
    expect(screen.getByText("Know them.")).toBeInTheDocument();
    expect(screen.queryByText("How it works.")).toBeNull();
    expect(screen.getByText("10 Nov 2026 · Video, 2:40")).toBeInTheDocument();
  });

  it("shows the featured post wide, with its excerpt, its title a level-2 heading", () => {
    render(<PostCard post={plain!} featured as="div" />);
    expect(screen.getByRole("heading", { level: 2, name: "Five scams" })).toBeInTheDocument();
    expect(screen.getByText("Know them.")).toBeInTheDocument();
  });

  it("lists posts and articles as results", () => {
    render(
      <ResultList>
        <PostResult post={film!} />
        <PostResult post={plain!} />
        <ArticleRow article={help!} topic />
        <ArticleRow article={help!} summary={false} />
      </ResultList>,
    );
    expect(screen.getByText("Product · Video")).toBeInTheDocument();
    expect(screen.getByText("Security and your account")).toBeInTheDocument();
    expect(screen.getAllByText("It stops money leaving.")).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: /How do I freeze my account/ })[0]).toHaveAttribute(
      "href",
      "/help/freeze",
    );
  });

  it("names the author with their role on a post", () => {
    render(<Author author="ifeoma" meta="14 Nov 2026 · 2 min read" large />);
    expect(screen.getByText("Ifeoma Nwankwo, Head of Risk and Compliance")).toBeInTheDocument();
  });
});

describe("finding your way", () => {
  it("marks the current topic, on blue and on paper", () => {
    const { rerender } = render(<TopicChips current="all" dark />);
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("aria-current", "page");
    rerender(<TopicChips current="safety" />);
    expect(screen.getByRole("link", { name: "Safety" })).toHaveAttribute(
      "href",
      "/blog/topic/safety",
    );
    expect(screen.getByRole("link", { name: "Safety" })).toHaveAttribute("aria-current", "page");
    rerender(<TopicChips all={false} />);
    expect(screen.queryByRole("link", { name: "All" })).toBeNull();
  });

  it("links every step of the crumbs but the last", () => {
    render(<Crumbs items={[["Blog", "/blog"], ["Safety"]]} dark />);
    expect(screen.getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/blog");
    expect(screen.getByText("Safety")).toHaveAttribute("aria-current", "page");
  });

  it("searches with a plain form, and clears the search", () => {
    const { rerender } = render(
      <SearchBox action="/help/search" label="Search Help" placeholder="Try it" />,
    );
    expect(screen.getByRole("search")).toHaveAttribute("action", "/help/search");
    expect(screen.getByLabelText("Search Help")).toHaveAttribute("name", "q");
    expect(screen.queryByRole("link", { name: "Clear the search" })).toBeNull();
    rerender(
      <SearchBox action="/help/search" label="Search Help" placeholder="Try it" query="withdraw" />,
    );
    expect(screen.getByLabelText("Search Help")).toHaveValue("withdraw");
    expect(screen.getByRole("link", { name: "Clear the search" })).toHaveAttribute(
      "href",
      "/help/search",
    );
  });

  it("offers a spelling as a new search", () => {
    render(<DidYouMean suggestion="withdraw" action="/help/search" />);
    expect(screen.getByRole("link", { name: "withdraw" })).toHaveAttribute(
      "href",
      "/help/search?q=withdraw",
    );
  });

  it("ends with the right buttons, freeze in red", () => {
    const { container, rerender } = render(<Actions actions={["freeze", "report"]} />);
    expect(screen.getByRole("link", { name: "Freeze my account" }).className).toContain(
      "bg-error-text",
    );
    expect(screen.getByRole("link", { name: "Report a scam" }).className).toContain("border-fg");
    rerender(<Actions actions={["check"]} />);
    expect(screen.getByRole("link", { name: "Check a payment" }).className).toContain("bg-accent");
    rerender(<Actions actions={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("marks sample content", () => {
    render(<SampleNote dark>Sample posts for the demo.</SampleNote>);
    expect(screen.getByText("Sample posts for the demo.").className).toContain("text-white/82");
  });
});

describe("an article", () => {
  it("draws every part, the first paragraph as the lead", () => {
    const { blocks } = parseDocument(
      [
        "---",
        "a: b",
        "---",
        "Lead [here](/freeze) and [there](https://example.com).",
        "",
        "Second.",
        "",
        "## Heading",
        "",
        "> Blue",
        "",
        "> ! Amber",
        "",
        "1. Step :: Detail",
        "2. Step two",
        "",
        "- 0:40 :: Short label",
        "",
        "- Long label here :: Text",
        "",
        "- Bullet",
      ].join("\n"),
    );
    render(<ArticleBody blocks={blocks} />);
    expect(screen.getByText("Lead", { exact: false }).closest("p")?.className).toContain("text-fg");
    expect(screen.getByText("Second.").closest("p")?.className).toContain("text-muted-fg");
    expect(screen.getByRole("heading", { level: 2, name: "Heading" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "here" })).toHaveAttribute("href", "/freeze");
    expect(screen.getByRole("link", { name: "there" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
    expect(screen.getByText("Amber").closest("p")?.className).toContain("bg-warn-bg");
    expect(screen.getByText("Detail")).toBeInTheDocument();
    expect(screen.getByText("Short label")).toBeInTheDocument();
    expect(screen.getByText("Bullet").closest("ul")).not.toBeNull();
  });
});

describe("share and feedback", () => {
  afterEach(() => vi.restoreAllMocks());

  it("copies the link, or says how to", async () => {
    const writeText = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("no"));
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<CopyLink />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Copy link" })));
    expect(screen.getByRole("status")).toHaveTextContent("Link copied.");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Copy link" })));
    expect(screen.getByRole("status")).toHaveTextContent("Copy the address");
  });

  it("answers Yes and No", () => {
    const { unmount } = render(<Helpful contactHref="/contact" />);
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(screen.getByRole("status")).toHaveTextContent("Glad it helped.");
    expect(screen.queryByRole("button", { name: "No" })).toBeNull();
    unmount();
    render(<Helpful contactHref="/contact" />);
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(screen.getByRole("link", { name: "contact us" })).toHaveAttribute("href", "/contact");
  });
});
