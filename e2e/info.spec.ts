import { expect, test } from "@playwright/test";

import { noViolations } from "./helpers/axe";
import { ANDROID_UA, expectNoSidewaysScroll } from "./helpers/site";

/** W3 · Information pages: what Cyber X is, what it costs, and the legal pages. */
const PAGES: [string, string][] = [
  ["/features", "Everything Cyber X does today."],
  ["/how-it-works", "Trust, built into every payment."],
  ["/security", "Fraud stops before the money moves."],
  ["/about", "Money should reach the right person. Every time."],
  ["/send-and-receive", "Pay people by name. Not by numbers."],
  ["/bills-and-airtime", "Pay the bill. Not the wrong account."],
  ["/online-payments", "One payment number per merchant."],
  ["/add-and-withdraw", "Your money in. Your money out."],
  ["/ask-x", "Ask about any payment."],
  ["/fees-and-limits", "Fees and limits."],
  ["/privacy", "Privacy policy."],
  ["/terms", "Terms of use."],
  ["/cookies", "Cookie policy."],
  ["/licences", "Licences and regulation."],
];

test.describe("Information pages", () => {
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

  test("Work out a fee gives the fee and total as you type", async ({ page }) => {
    await page.goto("/fees-and-limits");
    const card = page.locator("form", {
      has: page.getByRole("heading", { name: "Work out a fee" }),
    });
    await expect(card.getByText("₦25,010.00")).toBeVisible();
    await card.getByLabel("What are you doing?").selectOption("send");
    await card.getByLabel("Amount").fill("60,000");
    await expect(card.getByText("₦50.00")).toBeVisible();
    await expect(card.getByText("₦60,050.00")).toBeVisible();
    await card.getByLabel("Amount").fill("abc");
    await expect(card.getByText("Type an amount in naira, like 25,000.")).toBeVisible();
  });

  test("the fee and tier tables match the CBN figures", async ({ page }) => {
    await page.goto("/fees-and-limits");
    await expect(
      page.getByText("Free up to ₦5,000 · ₦10 up to ₦50,000 · ₦50 above").first(),
    ).toBeAttached();
    await expect(page.getByText("₦5,000,000.00").first()).toBeAttached();
    await expect(page.getByText("Last updated 15 November 2026")).toBeVisible();
  });

  test("no cookie is set until you choose, then your choice is kept", async ({ page, context }) => {
    await page.goto("/cookies");
    expect(await context.cookies()).toEqual([]);
    await page.locator("label", { has: page.getByRole("switch", { name: /Analytics/ }) }).click();
    await page.getByRole("button", { name: "Save my choices" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved. You can change these any time.");
    const saved = await context.cookies();
    expect(saved.map((cookie) => `${cookie.name}=${cookie.value}`)).toEqual([
      "cx_cookie_choices=p1a1",
    ]);
    expect(saved[0]!.sameSite).toBe("Lax");
    await page.reload();
    await expect(page.getByRole("switch", { name: /Analytics/ })).toBeChecked();
    await page.getByRole("button", { name: "Reject all but essential" }).click();
    expect((await context.cookies())[0]!.value).toBe("p0a0");
  });

  test("About says the team pictures are samples", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByText(/Sample team pictures for the demo/)).toBeAttached();
    await expect(page.locator("#team li")).toHaveCount(5);
  });

  test("Security’s freeze button is red and goes to Freeze my account", async ({ page }) => {
    await page.goto("/security");
    const freeze = page.getByRole("link", { name: "Freeze my account" }).first();
    await expect(freeze).toHaveAttribute("href", "/freeze");
    await expect(page.getByRole("link", { name: "Report a scam" }).first()).toHaveAttribute(
      "href",
      "/report",
    );
  });
});

test.describe("Information pages on Android", () => {
  test.use({ userAgent: ANDROID_UA });

  test("the approve button says fingerprint", async ({ page }) => {
    await page.goto("/send-and-receive");
    await expect(page.getByText("Approve with fingerprint")).toBeAttached();
  });
});
