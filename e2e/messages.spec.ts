import { expect, test } from "@playwright/test";

import { noViolations } from "./helpers/axe";
import { expectNoSidewaysScroll } from "./helpers/site";

/** W7.2 · Contact us, Complaints, Careers, built ahead of the app. Nothing is sent yet. */
for (const [path, title, form, button] of [
  ["/contact", "Contact us.", "Send us a message", "Send message"],
  ["/complaints", "Complaints.", "Make a complaint", "Send complaint"],
  ["/careers", "Build a new financial system with us.", "No open roles right now.", "Send"],
] as const) {
  test.describe(path, () => {
    test("opens, says nothing is sent yet, and shows what to fix", async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await expect(page.getByText(/open when Cyber X launches/)).toBeVisible();
      await expectNoSidewaysScroll(page);
      await noViolations(page);
      await page
        .getByRole("form", { name: form })
        .getByRole("button", { name: button, exact: true })
        .click();
      await expect(page.locator("main").getByRole("alert")).toContainText("need fixing");
      await noViolations(page);
    });

    test("sent: the Figma state, for review", async ({ page }) => {
      await page.goto(`${path}?preview=sent`);
      await expect(page.getByText(/^(CT|CMP|CR)-/)).toBeVisible();
      await noViolations(page);
    });
  });
}

test("a contact message that reads well: messages open soon, nothing sent", async ({ page }) => {
  await page.goto("/contact");
  await page.getByLabel("Your name").fill("Ada Obi");
  await page.getByLabel("Email or phone number").fill("ada@example.com");
  await page.getByLabel("What’s it about?").selectOption("payment");
  await page.getByLabel("Your message").fill("My payment is waiting. Why?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Messages open soon." })).toBeVisible();
  await noViolations(page);
});
