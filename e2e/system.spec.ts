import { expect, test } from "@playwright/test";

import { noViolations } from "./helpers/axe";
import { expectNoSidewaysScroll } from "./helpers/site";

/** W1.4 · Page not found, Something went wrong, Maintenance. */
test.describe("System pages", () => {
  test("a wrong address shows “This page isn’t here.” with a 404", async ({ page }) => {
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: "This page isn’t here." }),
    ).toBeVisible();
    await expect(page.getByText("If a payment link brought you here, don’t pay it.")).toBeVisible();
    await expect(page.getByRole("link", { name: /Freeze my account/ }).last()).toBeVisible();
    await expectNoSidewaysScroll(page);
    await noViolations(page);
  });

  test("a failure shows “Something went wrong” with its reference", async ({ page }) => {
    await page.goto("/error-check");
    await expect(
      page.getByRole("heading", { level: 1, name: "Something went wrong on our side." }),
    ).toBeVisible();
    await expect(page.locator("[data-error-reference]")).toHaveText(/^ERR-[0-9A-Z]{4}-\d{4}$/);
    await expect(page.getByText("Your money is safe: this website can’t move it.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await noViolations(page);
  });

  test("the maintenance page says the app isn’t affected", async ({ page }) => {
    await page.goto("/maintenance");
    await expect(
      page.getByRole("heading", { level: 1, name: "We’re making Cyber X better." }),
    ).toBeVisible();
    await expect(page.getByText("The app isn’t affected.")).toBeVisible();
    await expect(page.getByText(/never call or text to ask for your PIN/)).toBeVisible();
    await expectNoSidewaysScroll(page);
    await noViolations(page);
  });
});
