import { expect, test } from "@playwright/test";

import { noViolations } from "./helpers/axe";
import { expectNoSidewaysScroll } from "./helpers/site";

/** W8 · Blog and Help: posts and articles from files, topics, search. */
const PAGES: [string, string][] = [
  ["/blog", "Notes on money, trust and fraud."],
  ["/blog/topic/safety", "Safety."],
  ["/blog/five-scams", "Five scams to know before you pay a stranger"],
  ["/blog/pay-me-safely-buyers-side", "Pay me safely, the buyer’s side"],
  ["/blog/search?q=scam", "Search the blog"],
  ["/blog/search?q=refnd", "Search the blog"],
  ["/help", "How can we help?"],
  ["/help/topic/security", "Security and your account"],
  ["/help/how-do-i-freeze-my-account", "How do I freeze my account?"],
  ["/help/search?q=withdraw", "How can we help?"],
  ["/help/search?q=wirhdraw", "How can we help?"],
];

test.describe("Blog and Help pages", () => {
  for (const [path, title] of PAGES) {
    test(`${path} has its heading, passes axe and fits the screen`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expectNoSidewaysScroll(page);
      await noViolations(page);
    });
  }

  test("a post or topic that doesn’t exist shows Page not found", async ({ page }) => {
    expect((await page.goto("/blog/no-such-post"))?.status()).toBe(404);
    expect((await page.goto("/blog/topic/gossip"))?.status()).toBe(404);
    expect((await page.goto("/help/no-such-question"))?.status()).toBe(404);
  });
});

test.describe("Blog", () => {
  test("the topics filter the posts", async ({ page }) => {
    await page.goto("/blog");
    await page
      .getByRole("navigation", { name: "Blog topics" })
      .getByRole("link", { name: "Safety" })
      .click();
    await expect(page).toHaveURL(/\/blog\/topic\/safety$/);
    await expect(page.getByRole("heading", { level: 2, name: "3 posts" })).toBeVisible();
    const cards = page.locator("#posts li");
    await expect(cards).toHaveCount(3);
    for (const card of await cards.all())
      await expect(card.getByText("Safety", { exact: true })).toBeVisible();
    await page
      .getByRole("navigation", { name: "Blog topics" })
      .getByRole("link", { name: "Money" })
      .click();
    await expect(page.getByRole("heading", { level: 2, name: "1 post" })).toBeVisible();
  });

  test("a card opens its post, and the post links on", async ({ page }) => {
    await page.goto("/blog");
    await page.getByRole("link", { name: "Five scams to know before you pay a stranger" }).click();
    await expect(page.getByRole("heading", { level: 1, name: /Five scams/ })).toBeVisible();
    await expect(page.getByText("Ifeoma Nwankwo, Head of Risk and Compliance")).toBeVisible();
    await expect(page.getByRole("link", { name: "Report a scam" }).first()).toHaveAttribute(
      "href",
      "/report",
    );
    await expect(page.getByText(/Sample post for the demo/)).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Keep reading" })).toBeVisible();
  });

  test("search finds posts, and says when nothing matches", async ({ page }) => {
    await page.goto("/blog");
    await page.getByRole("searchbox", { name: "Search the blog" }).fill("scam");
    await page.getByRole("searchbox", { name: "Search the blog" }).press("Enter");
    await expect(page).toHaveURL(/\/blog\/search\?q=scam$/);
    await expect(
      page.getByRole("heading", { level: 2, name: /results? for “scam”/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Five scams to know before you pay a stranger" }),
    ).toBeVisible();
    await page.getByRole("searchbox", { name: "Search the blog" }).fill("refnd");
    await page.getByRole("searchbox", { name: "Search the blog" }).press("Enter");
    await expect(
      page.getByRole("heading", { level: 2, name: "No posts match “refnd”." }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Popular posts" })).toBeVisible();
  });
});

test.describe("Help", () => {
  test("the urgent cards open Freeze, Report a scam and Check a payment", async ({ page }) => {
    await page.goto("/help");
    const urgent = page.locator("#urgent");
    await expect(urgent.getByRole("link", { name: "Freeze my account" })).toHaveAttribute(
      "href",
      "/freeze",
    );
    await expect(urgent.getByRole("link", { name: "Report a scam" })).toHaveAttribute(
      "href",
      "/report",
    );
    await expect(urgent.getByRole("link", { name: "Check a payment" })).toHaveAttribute(
      "href",
      "/check",
    );
  });

  test("a topic lists its articles, and an article opens", async ({ page }) => {
    await page.goto("/help");
    await page
      .locator("#topics")
      .getByRole("link", { name: /See articles/ })
      .nth(4)
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Security and your account" }),
    ).toBeVisible();
    await page.getByRole("link", { name: /How do I freeze my account/ }).click();
    await expect(page.getByText("Updated 14 November 2026")).toBeVisible();
    await page.getByRole("button", { name: "No" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Sorry it didn’t" })).toBeVisible();
  });

  test("“withdraw” finds its articles; “wirhdraw” suggests withdraw", async ({ page }) => {
    await page.goto("/help");
    await page.getByRole("searchbox", { name: "Search Help" }).fill("withdraw");
    await page.getByRole("searchbox", { name: "Search Help" }).press("Enter");
    await expect(
      page.getByRole("heading", { level: 2, name: "4 results for “withdraw”" }),
    ).toBeVisible();
    for (const title of [
      "How do I withdraw to my bank?",
      "What does it cost to withdraw?",
      "Do withdrawals count towards my daily limit?",
      "Can I withdraw to someone else’s account?",
    ]) {
      await expect(
        page.getByRole("link", { name: new RegExp(title.replace("?", "\\?")) }),
      ).toBeVisible();
    }
    await page.goto("/help/search?q=wirhdraw");
    await expect(
      page.getByRole("heading", { level: 2, name: "No results for “wirhdraw”" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "withdraw", exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 2, name: "4 results for “withdraw”" }),
    ).toBeVisible();
  });
});
