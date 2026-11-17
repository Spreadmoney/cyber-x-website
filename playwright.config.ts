import { defineConfig, devices } from "@playwright/test";

/**
 * Phone and desktop tests run against the production build, at the three
 * widths the website is designed for: iPhone Safari (WebKit, 390), Android
 * Chrome (Chromium, 360) and a desktop browser (1440).
 */
const PORT = Number(process.env.PORT ?? 3200);
/**
 * Set E2E_BASE_URL to test a deployed copy instead of a local build, e.g.
 *   E2E_BASE_URL=https://cyber-x-website-chi.vercel.app npm run e2e
 */
const deployedURL = process.env.E2E_BASE_URL;
const baseURL = deployedURL ?? `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);
/** A Chromium already on this machine, where Playwright can't download its own. */
const chromium = process.env.CHROMIUM_PATH
  ? { launchOptions: { executablePath: process.env.CHROMIUM_PATH } }
  : {};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  // No retries on a laptop: a test that passes only sometimes is a bug.
  retries: isCI ? 1 : 0,
  reporter: isCI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 14"] } },
    {
      name: "android",
      use: { ...devices["Galaxy S8"], ...chromium },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, ...chromium },
    },
  ],
  // A deployed copy is already running, so only start a server for local runs.
  webServer: deployedURL
    ? undefined
    : {
        command: `npm run build && npm run start -- --port ${PORT}`,
        env: {
          // Only on test machines: /error-check fails on purpose (e2e/system.spec.ts).
          ENABLE_ERROR_PAGE_CHECK: "1",
          // The website's own address, so passkeys are checked against it.
          WEBSITE_URL: baseURL,
          // Codes show on the screen only for test numbers: the made-up
          // accounts (e2e/helpers/accounts.ts) use +23480…; +23481… is not one.
          SMS_TEST_NUMBERS: "+23480*",
          // The throwaway test database (scripts/db/test-db.mjs), when there is one.
          ...(process.env.E2E_DATABASE_URL ? { DATABASE_URL: process.env.E2E_DATABASE_URL } : {}),
        },
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 240_000,
      },
});
