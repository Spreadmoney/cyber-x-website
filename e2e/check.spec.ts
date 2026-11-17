import { expect, test } from "@playwright/test";

import { noViolations } from "./helpers/axe";
import { expectNoSidewaysScroll } from "./helpers/site";

/**
 * W4 · Check a payment, built ahead of the app (17 Nov 2026). Until the app
 * can send payments, a check says checks start soon; the Real and Not found
 * states are reviewed through previews (PAGE_PREVIEWS=on, never live).
 */
test.describe("Check a payment (W4)", () => {
  test("asks for the reference and amount, and says what to fix", async ({ page }) => {
    await page.goto("/check");
    await expect(page.getByRole("heading", { level: 1, name: "Check a payment." })).toBeVisible();
    await expect(page.getByText("Checks start when Cyber X payments go live.")).toBeVisible();
    await expectNoSidewaysScroll(page);
    await noViolations(page);
    await page.getByRole("button", { name: "Check payment" }).click();
    await expect(page.getByLabel("Reference")).toHaveAttribute("aria-invalid", "true");
    await expect(
      page.getByText("Enter the amount from the receipt, like ₦25,000.00."),
    ).toBeVisible();
    await noViolations(page);
  });

  test("before payments are live, a check says so and never calls a receipt fake", async ({
    page,
  }) => {
    await page.goto("/check");
    await page.getByLabel("Reference").fill("dx-7741-0912");
    await page.getByLabel("Amount").fill("25,000");
    await page.getByRole("button", { name: "Check payment" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Checks start soon." })).toBeVisible();
    await expect(page.getByText(/DX‑7741‑0912 for ₦25,000\.00/)).toBeVisible();
    await expect(page.getByText(/may be fake/)).toHaveCount(0);
    await noViolations(page);
    await page.getByRole("button", { name: "Check again" }).click();
    await expect(page.getByLabel("Reference")).toHaveValue("DX-7741-0912");
  });

  for (const [preview, title] of [
    ["real", "This payment is real."],
    ["not_found", "We can’t find this payment."],
  ] as const) {
    test(`${preview}: the Figma state, for review`, async ({ page }) => {
      await page.goto(`/check?preview=${preview}`);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await expectNoSidewaysScroll(page);
      await noViolations(page);
    });
  }

  test("Security and the help articles link here", async ({ page }) => {
    await page.goto("/help/is-this-payment-real");
    const link = page.locator("main a[href='/check']").first();
    await expect(link).toBeVisible();
  });
});
