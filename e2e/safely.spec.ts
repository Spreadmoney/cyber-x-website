import { expect, test } from "@playwright/test";

import { noViolations } from "./helpers/axe";
import { expectNoSidewaysScroll } from "./helpers/site";

/**
 * W6 · Pay me safely links, built ahead of the app (17 Nov 2026). Until the
 * app has Pay me safely, no link is real; the 12 buyer screens are reviewed
 * through previews (PAGE_PREVIEWS=on, never live).
 */
const SCREENS = [
  ["/s/kemi7Q2mX9?preview=link", "Pay Kemi safely."],
  ["/s/kemi7Q2mX9?preview=pay_by_card", "Pay ₦18,500.00 by card."],
  ["/s/kemi7Q2mX9?preview=held", "Your payment is held."],
  ["/o/b1s1Ord3rT0k3n?preview=open_order", "Open your order."],
  ["/o/b1s1Ord3rT0k3n?preview=waiting", "Your order."],
  ["/o/b1s1Ord3rT0k3n?preview=cancel", "Cancel your order?"],
  ["/o/b1s1Ord3rT0k3n?preview=cancelled", "Order cancelled."],
  ["/o/b1s1Ord3rT0k3n?preview=sent", "Your order is on its way."],
  ["/o/b1s1Ord3rT0k3n?preview=did_it_arrive", "Did your order arrive?"],
  ["/o/b1s1Ord3rT0k3n?preview=paid", "Kemi has been paid."],
  ["/o/b1s1Ord3rT0k3n?preview=whats_wrong", "What’s wrong?"],
  ["/o/b1s1Ord3rT0k3n?preview=report_received", "We’ve got your report."],
] as const;

test.describe("Pay me safely link (W6)", () => {
  for (const path of ["/s/kemi7Q2mX9", "/o/b1s1Ord3rT0k3n"]) {
    test(`${path}: isn't a real link yet`, async ({ page }) => {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { level: 1, name: "This isn’t a real Cyber X link." }),
      ).toBeVisible();
    });
  }

  for (const [path, title] of SCREENS) {
    test(`${title}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await expectNoSidewaysScroll(page);
      await noViolations(page);
    });
  }

  test("the review click-through: pay by card, held, open, arrived, paid", async ({ page }) => {
    await page.goto("/s/kemi7Q2mX9?preview=link");
    await page.getByRole("link", { name: "Pay by card" }).click();
    await page.getByRole("button", { name: "Continue to secure payment" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Your payment is held." }),
    ).toBeVisible();
    await page.getByRole("link", { name: /Open the texted link/ }).click();
    await page.getByRole("button", { name: "Open my order" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Your order." })).toBeVisible();
    await page.getByRole("link", { name: /Once Kemi sends it/ }).click();
    await page.getByRole("link", { name: "It arrived" }).click();
    await page.getByRole("link", { name: "Yes, it arrived" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Kemi has been paid." }),
    ).toBeVisible();
  });
});
