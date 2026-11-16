import { expect, test } from "@playwright/test";

/**
 * Using the website with a keyboard alone (WCAG 2.4.7, 2.4.11): every Tab
 * stop can be seen, shows a focus ring, and isn't hidden under the menu bar.
 */
const PAGES = ["/", "/sign-in", "/freeze", "/help", "/blog", "/fees-and-limits", "/cookies"];

test.describe("Keyboard", () => {
  for (const path of PAGES) {
    test(`${path}: every Tab stop is visible, ringed and not under the menu bar`, async ({
      page,
    }, info) => {
      test.skip(info.project.name === "iphone", "Safari skips links on Tab unless set to");
      await page.goto(path);
      const problems: string[] = [];
      for (let stop = 0; stop < 50; stop++) {
        await page.keyboard.press("Tab");
        const problem = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return null;
          const ringed = (node: Element) => {
            const style = getComputedStyle(node);
            return (
              (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) ||
              style.boxShadow !== "none"
            );
          };
          const name = `${el.tagName.toLowerCase()} “${(el.textContent || el.getAttribute("aria-label") || el.id).trim().slice(0, 30)}”`;
          let shown: Element = el;
          const box = el.getBoundingClientRect();
          if (box.width < 4 || box.height < 4) {
            // A hidden switch shows itself through the drawing next to it.
            if (el instanceof HTMLInputElement && el.type === "checkbox" && el.nextElementSibling) {
              shown = el.nextElementSibling;
            } else {
              return `${name} can't be seen`;
            }
          }
          let ring = ringed(shown);
          for (
            let up = shown.parentElement, i = 0;
            !ring && up && i < 3;
            up = up.parentElement, i++
          ) {
            ring = ringed(up);
          }
          if (!ring) return `${name} shows no focus ring`;
          const rect = shown.getBoundingClientRect();
          const x = Math.min(Math.max(rect.left + rect.width / 2, 1), innerWidth - 1);
          const y = Math.min(Math.max(rect.top + Math.min(rect.height / 2, 8), 1), innerHeight - 1);
          const top = document.elementFromPoint(x, y);
          if (top?.closest("header") && !shown.closest("header"))
            return `${name} is under the menu bar`;
          return null;
        });
        if (problem) problems.push(problem);
      }
      expect([...new Set(problems)]).toEqual([]);
    });
  }
});
