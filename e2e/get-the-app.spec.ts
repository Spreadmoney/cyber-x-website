import { expect, test } from "@playwright/test";

import { noViolations } from "./helpers/axe";
import { ANDROID_UA, APP_URL, IPHONE_UA, expectNoSidewaysScroll, isDesktop } from "./helpers/site";

/** W1.3 · Get the app. */
test.describe("Get the app", () => {
  test("Try the demo opens the app", async ({ page }) => {
    await page.goto("/get-the-app");
    const demo = page.getByRole("link", { name: "Try the demo" }).filter({ visible: true }).first();
    await expect(demo).toHaveAttribute("href", new RegExp(`^${APP_URL.replace(/[.]/g, "\\.")}/?$`));
  });

  test("a store button opens “Coming to the stores”, which points to the demo", async ({
    page,
  }) => {
    await page.goto("/get-the-app");
    await page
      .getByRole("button", { name: /App Store/ })
      .filter({ visible: true })
      .first()
      .click();
    const sheet = page.getByRole("dialog", { name: "Coming to the stores" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Try the demo" })).toHaveAttribute(
      "href",
      new RegExp(`^${APP_URL.replace(/[.]/g, "\\.")}/?$`),
    );
    await noViolations(page);
    await sheet.getByRole("button", { name: "Close" }).click();
    await expect(sheet).toBeHidden();
  });

  test("explains sign-up, what you'll need and the Tier 1 limits", async ({ page }) => {
    await page.goto("/get-the-app");
    await expect(page.getByRole("heading", { name: "How sign-up works." })).toBeVisible();
    for (const step of [
      "Confirm your phone number",
      "Sign in with biometrics",
      "Choose your alias",
      "Verify who you are",
    ]) {
      await expect(page.getByText(step, { exact: true })).toBeVisible();
    }
    await expect(page.getByText("You start at Tier 1: send up to ₦50,000 a day")).toBeVisible();
  });

  test("desktop shows both stores and a QR code", async ({ page }) => {
    test.skip(!isDesktop(page), "desktop only");
    await page.goto("/get-the-app");
    await expect(
      page.getByRole("button", { name: /App Store/ }).filter({ visible: true }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: /Google Play/ }).filter({ visible: true }),
    ).toHaveCount(1);
    const qr = page.getByRole("img", { name: /QR code/ });
    await expect(qr).toBeVisible();
    await expect(qr.locator("svg")).toHaveCount(1);
  });

  test("fits the screen and has no accessibility problems", async ({ page }) => {
    await page.goto("/get-the-app");
    await expectNoSidewaysScroll(page);
    await noViolations(page);
  });
});

test.describe("Get the app on an iPhone", () => {
  test.use({ userAgent: IPHONE_UA });
  test("leads with the App Store", async ({ page }) => {
    test.skip(isDesktop(page), "phones only");
    await page.goto("/get-the-app");
    await expect(
      page.getByRole("button", { name: /App Store/ }).filter({ visible: true }),
    ).toHaveText(/Download on the\s*App Store/);
    await expect(
      page.getByRole("button", { name: /On Android\? Get it on Google Play/ }),
    ).toBeVisible();
    await expect(page.getByText("Turn on Face ID. A password backs it up.")).toBeVisible();
  });
});

test.describe("Get the app on Android", () => {
  test.use({ userAgent: ANDROID_UA });
  test("leads with Google Play", async ({ page }) => {
    test.skip(isDesktop(page), "phones only");
    await page.goto("/get-the-app");
    await expect(
      page
        .getByRole("button", { name: /Google Play/ })
        .filter({ visible: true })
        .first(),
    ).toHaveText(/Get it on\s*Google Play/);
    await expect(
      page.getByRole("button", { name: /On iPhone\? Download on the App Store/ }),
    ).toBeVisible();
    await expect(page.getByText("Android 9 or later for fingerprint sign-in.")).toBeVisible();
  });
});
