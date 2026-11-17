import { expect, test } from "@playwright/test";

import { noViolations } from "./helpers/axe";
import { expectNoSidewaysScroll } from "./helpers/site";

/** W7.1 · Report a scam, built ahead of the app (17 Nov 2026). Nothing is sent yet. */
test.describe("Report a scam (W7.1)", () => {
  test("says nothing is sent yet, shows what to fix, and keeps what was typed", async ({
    page,
  }) => {
    await page.goto("/report");
    await expect(page.getByRole("heading", { level: 1, name: "Report a scam." })).toBeVisible();
    await expect(page.getByText(/nothing sent here reaches our team/)).toBeVisible();
    await expectNoSidewaysScroll(page);
    await noViolations(page);
    await page.getByLabel("Tell us what happened").fill("Short");
    await page.getByRole("button", { name: "Send report" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("Three things need fixing");
    await expect(page.getByLabel("Tell us what happened")).toHaveValue("Short");
    await noViolations(page);
  });

  test("a report that reads well: reports open soon, nothing sent", async ({ page }) => {
    await page.goto("/report");
    await page.getByText("A fake payment link or receipt").click();
    await page.getByLabel("When did it happen?").fill("2026-11-10");
    await page
      .getByLabel("Tell us what happened")
      .fill("Someone sent me a receipt for a payment that never arrived.");
    await page.getByRole("button", { name: "Send report" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Reports open soon." })).toBeVisible();
    await noViolations(page);
  });

  test("sent: the Figma state, for review", async ({ page }) => {
    await page.goto("/report?preview=sent");
    await expect(page.getByRole("heading", { level: 1, name: "Report sent." })).toBeVisible();
    await noViolations(page);
  });
});
