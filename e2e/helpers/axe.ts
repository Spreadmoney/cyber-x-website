import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/**
 * No WCAG 2.2 AA problems on the page as it settles. Short colour changes
 * (CSS transitions, 150 ms) are allowed to finish first: a button fading
 * from grey to blue measures badly halfway (2.4:1), though it is 4.5:1 or
 * better before and after. Long-running animations, such as the code
 * screen's 60-second countdown, are not waited for, and the wait never
 * exceeds one second.
 */
export async function noViolations(page: Page) {
  await page.evaluate(() =>
    Promise.race([
      Promise.all(
        document
          .getAnimations()
          .filter((animation) => animation instanceof CSSTransition)
          .map((animation) => animation.finished.catch(() => null)),
      ),
      new Promise((resolve) => window.setTimeout(resolve, 1000)),
    ]),
  );
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(results.violations).toEqual([]);
}
