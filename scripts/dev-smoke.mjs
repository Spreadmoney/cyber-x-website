/**
 * Development-preview check (npm run check:dev).
 *
 * Some Next.js rules are only enforced by the development preview
 * (`npm run dev`), not by the production build the phone tests use: for
 * example, "instant navigation", which wants any page that reads its web
 * address to do so inside <Suspense>. This check starts the preview, visits
 * every page it can find from the home page, and fails if Next.js or the
 * browser reports any error.
 */
import { spawn } from "node:child_process";

import { chromium } from "@playwright/test";

const PORT = Number(process.env.DEV_SMOKE_PORT ?? 3301);
const BASE = `http://localhost:${PORT}`;
const START_PAGES = ["/"];
const MAX_PAGES = 120;

const problems = [];
const serverLog = [];

const server = spawn("npx", ["next", "dev", "--port", String(PORT)], {
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  stdio: ["ignore", "pipe", "pipe"],
  // Its own process group, so the preview and everything it starts can be stopped together.
  detached: true,
});

const exited = new Promise((resolve) => server.on("exit", resolve));

function signalServer(signal) {
  try {
    process.kill(-server.pid, signal);
  } catch {
    // Already stopped.
  }
}

/** Stops the preview and everything it started, and waits until it has gone. */
async function stopServer() {
  signalServer("SIGTERM");
  const stopped = await Promise.race([
    exited.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 5000)),
  ]);
  if (!stopped) signalServer("SIGKILL");
  // Give its child processes a moment to follow.
  await new Promise((resolve) => setTimeout(resolve, 500));
  signalServer("SIGKILL");
}
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await stopServer();
    process.exit(1);
  });
}
for (const stream of [server.stdout, server.stderr]) {
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => serverLog.push(chunk));
}

function serverErrors(from) {
  return serverLog
    .slice(from)
    .join("")
    .split("\n")
    .filter((line) => /\b(Error|⨯)\b/.test(line) && !/ignored package-lock/.test(line));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(`${BASE}/`);
      if (response.ok) return;
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("The development preview did not start within 60 seconds.");
}

/** True when Next.js's overlay is showing an error (not just its small "N" badge). */
function hasErrorOverlay(portals) {
  return portals.some((portal) => {
    const root = portal.shadowRoot;
    return Boolean(
      root?.querySelector(
        "[data-nextjs-dialog], [data-nextjs-toast][data-issues], [data-issues-count]",
      ),
    );
  });
}

async function main() {
  await waitForServer();
  // A Chromium already on this machine, where Playwright can't download its own.
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );
  const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`${page.url()}: console: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`${page.url()}: ${error.message}`));

  const queue = [...START_PAGES];
  const seen = new Set();
  while (queue.length > 0 && seen.size < MAX_PAGES) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);

    const logMark = serverLog.length;
    const response = await page.goto(`${BASE}${path}`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    if (!response || response.status() >= 400) {
      problems.push(`${path}: HTTP ${response?.status() ?? "no response"}`);
      continue;
    }

    // Next.js shows its error overlay over the page when something is wrong.
    if ((await page.locator("nextjs-portal").evaluateAll(hasErrorOverlay)) === true) {
      problems.push(`${path}: Next.js is showing its error overlay`);
    }

    for (const line of serverErrors(logMark)) problems.push(`${path}: server: ${line.trim()}`);

    const links = await page
      .locator("a[href^='/']")
      .evaluateAll((anchors) => anchors.map((anchor) => new URL(anchor.href).pathname));
    for (const link of links) if (!seen.has(link)) queue.push(link);
  }

  await browser.close();
  console.log(`Development preview: visited ${seen.size} pages.`);
}

let failed = false;
try {
  await main();
} catch (error) {
  problems.push(String(error));
} finally {
  await stopServer();
}

if (problems.length > 0) {
  failed = true;
  console.error(`Development preview check FAILED (${problems.length}):`);
  for (const problem of [...new Set(problems)]) console.error(`  - ${problem}`);
} else {
  console.log("Development preview check passed: no errors.");
}
process.exit(failed ? 1 : 0);
