import "server-only";

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export interface ContentFile {
  slug: string;
  source: string;
}

/** Every .md file in content/<folder>, named by its file name. */
export function readFolder(folder: "blog" | "help"): ContentFile[] {
  const dir = path.join(process.cwd(), "content", folder);
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => ({
      slug: name.slice(0, -3),
      source: readFileSync(path.join(dir, name), "utf8"),
    }));
}

/** Read once in production; read again on every page view while working on the site. */
export function cached<T>(load: () => T): () => T {
  let value: T | undefined;
  return () => {
    if (process.env.NODE_ENV !== "production") return load();
    value ??= load();
    return value;
  };
}
