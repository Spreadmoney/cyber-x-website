/**
 * Shared parts, copied from the app (npm run sync:shared) and checked
 * (npm run check:shared, part of every check and every build).
 *
 * Codebase is looked for beside this folder (../Codebase), or wherever
 * CODEBASE_DIR points. Where it isn't (GitHub, Vercel), the check still
 * proves that no copy was edited by hand since the last sync.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { findDrift, sha256, target, transform } from "./core.mjs";
import { SHARED } from "./list.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const CODEBASE = resolve(ROOT, process.env.CODEBASE_DIR ?? "../Codebase");
const LOCK = join(ROOT, "shared.lock.json");

const read = (base) => (path) => {
  const file = join(base, path);
  return existsSync(file) ? readFileSync(file) : null;
};
const codebaseHere = existsSync(join(CODEBASE, "package.json"));

function sync() {
  if (!codebaseHere) {
    console.error(`Codebase isn't at ${CODEBASE}. Set CODEBASE_DIR to the app's folder.`);
    process.exit(1);
  }
  const files = {};
  for (const entry of SHARED) {
    const source = read(CODEBASE)(entry.from);
    if (!source) {
      console.error(`${entry.from} is not in Codebase.`);
      process.exit(1);
    }
    const copy = transform(entry, source);
    const path = target(entry);
    mkdirSync(dirname(join(ROOT, path)), { recursive: true });
    writeFileSync(join(ROOT, path), copy);
    files[path] = { from: entry.from, sha256: sha256(copy) };
  }
  writeFileSync(LOCK, `${JSON.stringify({ source: "Codebase", files }, null, 2)}\n`);
  console.log(`Synced ${SHARED.length} shared parts from Codebase.`);
}

function check() {
  if (!existsSync(LOCK)) {
    console.error("shared.lock.json is missing: run npm run sync:shared.");
    process.exit(1);
  }
  const lock = JSON.parse(readFileSync(LOCK, "utf8"));
  const problems = findDrift({
    list: SHARED,
    lock,
    readCopy: read(ROOT),
    readSource: codebaseHere ? read(CODEBASE) : null,
  });
  if (problems.length > 0) {
    console.error(`Shared parts have drifted (${problems.length}):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(
    codebaseHere
      ? `Shared parts: all ${SHARED.length} match Codebase.`
      : `Shared parts: all ${SHARED.length} copies unchanged since the last sync (Codebase isn't on this machine).`,
  );
}

if (process.argv.includes("--check")) check();
else sync();
