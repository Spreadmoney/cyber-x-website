import { expect, test } from "@playwright/test";

/**
 * iPhone Safari zooms the whole page in when you tap a form field whose text
 * is smaller than 16px, and the page stays zoomed (Ayora, 16 Nov). Every
 * field people type into must be 16px or more on phones.
 */
const PAGES_WITH_FIELDS = [
  "/fees-and-limits",
  "/blog",
  "/blog/search?q=scam",
  "/help",
  "/help/search?q=withdraw",
  "/sign-in",
  "/freeze",
];

test.describe("Form fields", () => {
  for (const path of PAGES_WITH_FIELDS) {
    test(`${path}: fields are big enough that iPhone doesn’t zoom in`, async ({ page }) => {
      await page.goto(path);
      const sizes = await page
        .locator(
          "input:not([type=checkbox]):not([type=radio]):not([type=hidden]), select, textarea",
        )
        .evaluateAll((fields) =>
          fields.map((field) => parseFloat(getComputedStyle(field).fontSize)),
        );
      expect(sizes.length).toBeGreaterThan(0);
      for (const size of sizes) expect(size).toBeGreaterThanOrEqual(16);
    });
  }

  test("typing an amount doesn’t widen the page", async ({ page }) => {
    await page.goto("/fees-and-limits");
    await page.getByLabel("Amount").fill("1,250,000");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
