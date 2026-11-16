import { expect, test } from "@playwright/test";

import { noViolations } from "./helpers/axe";
import { expectNoSidewaysScroll, sameSiteLinks } from "./helpers/site";

/** W1.2 · Home, draft 3. */
test.describe("Home", () => {
  test("has the eight parts, in order", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "A new financial system, built around people." }),
    ).toBeVisible();
    const headings = await page.locator("main h2").allInnerTexts();
    expect(headings.map((text) => text.replace(/\s+/g, " ").trim())).toEqual([
      "Money is not the point. Value is.",
      "Your bank app sends money. Cyber X makes sure of it.",
      "What you can do today.",
      "First, protect what you have. Then, grow it.",
      "Questions.",
      "Your money. Going only where you send it.",
    ]);
    await expect(page.getByText("Who’s behind it")).toBeVisible();
    await expect(page.getByText("Ayora Okafor")).toBeVisible();
  });

  test("never shows a balance and makes no refund promise", async ({ page }) => {
    await page.goto("/");
    const text = await page.locator("main").innerText();
    expect(text).not.toMatch(/your balance/i);
    expect(text).toContain("We don’t promise refunds.");
    expect(text).not.toMatch(/we (will|’ll) refund/i);
  });

  test("questions open and close", async ({ page }) => {
    await page.goto("/");
    const cost = page.locator("details", { hasText: "What does it cost?" });
    await expect(cost.getByText("Every fee is shown before you approve.")).toBeHidden();
    await cost.locator("summary").click();
    await expect(cost.getByText("Every fee is shown before you approve.")).toBeVisible();
  });

  test("every link leads to a page or to “This page isn’t here”, never an error", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    for (const path of await sameSiteLinks(page)) {
      const response = await request.get(path);
      expect([200, 404], path).toContain(response.status());
    }
  });

  test("fits the screen and has no accessibility problems", async ({ page }) => {
    await page.goto("/");
    await expectNoSidewaysScroll(page);
    await noViolations(page);
  });
});
