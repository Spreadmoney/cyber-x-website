import { createHash } from "node:crypto";

/** The note at the top of every copied text file. */
export function header(from, kind) {
  const words = `Copied from Codebase (${from}) by \`npm run sync:shared\`. Change it there, then sync. Never edit it here.`;
  if (kind === "css") return `/* ${words} */\n\n`;
  return `// ${words}\n\n`;
}

export function kindOf(path) {
  if (/\.(ts|tsx|mts|mjs|js)$/.test(path)) return "code";
  if (path.endsWith(".css")) return "css";
  return "binary";
}

/** The @theme { … } block of a stylesheet, braces matched. */
export function extractTheme(css) {
  const start = css.indexOf("@theme {");
  if (start === -1) throw new Error("The stylesheet has no @theme block.");
  let depth = 0;
  for (let index = css.indexOf("{", start); index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") {
      depth -= 1;
      if (depth === 0) return `${css.slice(start, index + 1)}\n`;
    }
  }
  throw new Error("The @theme block is not closed.");
}

/** What the website's copy of a shared file must hold, given the app's file. */
export function transform(entry, source) {
  const kind = kindOf(entry.from);
  if (kind === "binary") return source;
  let text = source.toString("utf8");
  if (entry.extract === "theme") text = extractTheme(text);
  return Buffer.from(header(entry.from, kindOf(entry.to ?? entry.from)) + text, "utf8");
}

export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export const target = (entry) => entry.to ?? entry.from;

/**
 * Compares the website's copies with the lock file (and with Codebase, when
 * it is on this machine). Returns the problems, in plain words.
 *
 * @param {object} args
 * @param {{from: string, to?: string, extract?: string}[]} args.list
 * @param {{files: Record<string, {from: string, sha256: string}>}} args.lock
 * @param {(path: string) => Buffer | null} args.readCopy   a file in the website
 * @param {((path: string) => Buffer | null) | null} args.readSource   a file in Codebase, or null when Codebase isn't here
 */
export function findDrift({ list, lock, readCopy, readSource }) {
  const problems = [];
  const listed = new Set(list.map(target));
  for (const path of Object.keys(lock.files)) {
    if (!listed.has(path))
      problems.push(`${path} is in the lock file but not in the list: run the sync.`);
  }
  for (const entry of list) {
    const path = target(entry);
    const locked = lock.files[path];
    if (!locked) {
      problems.push(`${path} has never been synced: run npm run sync:shared.`);
      continue;
    }
    const copy = readCopy(path);
    if (!copy) problems.push(`${path} is missing here: run npm run sync:shared.`);
    else if (sha256(copy) !== locked.sha256) {
      problems.push(
        `${path} was edited here. Shared parts are changed in Codebase (${entry.from}), then synced.`,
      );
    }
    if (readSource) {
      const source = readSource(entry.from);
      if (!source) problems.push(`${entry.from} is no longer in Codebase.`);
      else if (sha256(transform(entry, source)) !== locked.sha256) {
        problems.push(
          `${entry.from} changed in Codebase since the last sync: run npm run sync:shared.`,
        );
      }
    }
  }
  return problems;
}
