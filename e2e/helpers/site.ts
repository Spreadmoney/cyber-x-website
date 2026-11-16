import { expect, type Page } from "@playwright/test";

export const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
export const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";

/** The app's address the website was started with (the laptop default). */
export const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

/** True on the desktop width (1440), where the full menu bar shows. */
export function isDesktop(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= 1024;
}

/** Every same-site link on the page, once each. */
export async function sameSiteLinks(page: Page): Promise<string[]> {
  const links = await page
    .locator("a[href^='/']")
    .evaluateAll((anchors) =>
      anchors.map((anchor) => new URL((anchor as HTMLAnchorElement).href).pathname),
    );
  return [...new Set(links)];
}

export async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}
