import { expect, test } from "@playwright/test";

import { noViolations } from "./helpers/axe";
import { isDesktop } from "./helpers/site";

/** W1.1 · The menu bar, the phone menu and the footer, on every width. */
test.describe("Menu bar and footer", () => {
  test("the menu bar stays at the top while the page scrolls", async ({ page }) => {
    await page.goto("/");
    const bar = page.getByRole("navigation", { name: "Main" });
    await expect(bar).toBeVisible();
    const before = await bar.boundingBox();
    // Scrolled by the page itself: mobile WebKit has no mouse wheel.
    await page.evaluate(() => window.scrollTo(0, 2500));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
    const after = await bar.boundingBox();
    expect(Math.round(after!.y)).toBe(Math.round(before!.y));
    await expect(bar).toBeInViewport();
  });

  test("the menu bar's Get the app opens Get the app", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Get the app" })
      .click();
    await expect(page).toHaveURL(/\/get-the-app$/);
    await expect(page.getByRole("heading", { level: 1, name: "Get Cyber X." })).toBeVisible();
  });

  test("the logo goes back to Home", async ({ page }) => {
    await page.goto("/get-the-app");
    await page.getByRole("link", { name: "Cyber X, Home" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("desktop shows the links; phones show a menu that opens and closes", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main" });
    if (isDesktop(page)) {
      for (const name of [
        "Features",
        "How it works",
        "Security",
        "Help",
        "About",
        "Blog",
        "Sign in",
      ]) {
        await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
      }
      await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();
      return;
    }
    const open = page.getByRole("button", { name: "Open menu" });
    await expect(open).toHaveAttribute("aria-expanded", "false");
    await open.click();
    const menu = page.locator("#site-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("link", { name: "Sign in" })).toBeVisible();
    await noViolations(page);
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(menu).toBeHidden();
  });

  test("the footer lists every group, with the legal line", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(
      footer.getByText("Cyber X will never ask for your PIN, password or codes."),
    ).toBeVisible();
    if (isDesktop(page)) {
      for (const title of ["Individual", "Security", "Help", "Company", "Legal"]) {
        await expect(footer.getByRole("heading", { name: title })).toBeVisible();
      }
      await expect(footer.getByRole("link", { name: "Licences" })).toBeVisible();
    } else {
      const legal = footer.locator("summary", { hasText: "Legal" });
      await expect(footer.getByRole("link", { name: "Licences" })).toBeHidden();
      await legal.click();
      await expect(footer.getByRole("link", { name: "Licences" })).toBeVisible();
    }
  });
});
