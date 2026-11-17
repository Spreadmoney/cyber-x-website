import { expect, test } from "@playwright/test";

import { noViolations } from "./helpers/axe";
import { expectNoSidewaysScroll } from "./helpers/site";

/**
 * W5 · Payment request links, built ahead of the app (17 Nov 2026). Until the
 * app makes requests (M7), no link is real; the other states are reviewed
 * through previews (PAGE_PREVIEWS=on, never live).
 */
test.describe("Payment request link (W5)", () => {
  for (const code of ["k7Q2mX9pLw", "not-a-code!", "x"]) {
    test(`${code}: isn't a real link yet, and isn't indexed`, async ({ page }) => {
      await page.goto(`/r/${encodeURIComponent(code)}`);
      await expect(
        page.getByRole("heading", { level: 1, name: "This isn’t a real Cyber X link." }),
      ).toBeVisible();
      await expect(page.locator("meta[name='robots']")).toHaveAttribute("content", /noindex/);
      await noViolations(page);
    });
  }

  for (const [preview, title] of [
    ["open", "Chidi sent you a request."],
    ["paid", "Paid in full."],
    ["expired", "This request has expired."],
    ["cancelled", "Chidi cancelled this request."],
  ] as const) {
    test(`${preview}: the Figma state, never with an amount`, async ({ page }) => {
      await page.goto(`/r/k7Q2mX9pLw?preview=${preview}`);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await expect(page.locator("main")).not.toContainText("₦");
      await expectNoSidewaysScroll(page);
      await noViolations(page);
    });
  }
});
