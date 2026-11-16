import { expect, test } from "@playwright/test";

import { noViolations } from "./helpers/axe";

test.describe("Foundation", () => {
  test("sends the security headers with every page", async ({ request }) => {
    const response = await request.get("/");
    expect(response.status()).toBe(200);

    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
    expect(headers["strict-transport-security"]).toContain("max-age=63072000");
    // The website needs no camera, microphone or location.
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["permissions-policy"]).toContain("microphone=()");
    expect(headers["permissions-policy"]).toContain("geolocation=()");
    // Never advertise the framework.
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("speaks British English and has a title", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en-GB");
    await expect(page).toHaveTitle("Cyber X");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("draws the naira sign in the brand font, not a fallback", async ({ page }) => {
    await page.goto("/");
    const loaded = await page.evaluate(async () => {
      const sans = await document.fonts.load('500 17px "Plus Jakarta Sans Variable"', "₦5,000");
      const mono = await document.fonts.load('400 17px "IBM Plex Mono"', "CT-7Q4M-1611");
      return {
        sans: sans.map((face) => face.status),
        mono: mono.map((face) => face.status),
        nairaReady: document.fonts.check('500 17px "Plus Jakarta Sans Variable"', "₦"),
      };
    });
    expect(loaded.sans.length).toBeGreaterThanOrEqual(2);
    expect(loaded.sans.every((status) => status === "loaded")).toBe(true);
    expect(loaded.mono.length).toBeGreaterThanOrEqual(1);
    expect(loaded.mono.every((status) => status === "loaded")).toBe(true);
    expect(loaded.nairaReady).toBe(true);
  });

  test("lets people zoom the page", async ({ page }) => {
    await page.goto("/");
    const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
    // People who need larger text must be able to zoom (WCAG 1.4.4).
    expect(viewport).not.toContain("user-scalable=no");
    expect(viewport).not.toContain("maximum-scale");
    expect(viewport).toContain("viewport-fit=cover");
  });

  test("has no accessibility problems", async ({ page }) => {
    await page.goto("/");
    await noViolations(page);
  });

  test("fits the screen with no sideways scrolling", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
