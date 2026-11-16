import { z } from "zod";

import { ACTION_KEYS, type Action } from "./topics";

/** File names become addresses, so they are kept simple. */
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED = new Set(["search", "topic"]);

export function checkSlug(slug: string, folder: string) {
  if (!SLUG.test(slug) || RESERVED.has(slug)) {
    throw new Error(
      `content/${folder}/${slug}.md: use lower-case words joined by dashes, not "search" or "topic".`,
    );
  }
}

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Write dates as 2026-11-14.")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Not a real date.");

/** "report, check" → ["report", "check"]. */
export const list = z
  .string()
  .optional()
  .transform((value) =>
    value
      ? value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
  );

export const actions = list.pipe(z.array(z.enum(ACTION_KEYS as [Action, ...Action[]])));

export function describe(error: z.ZodError, where: string): Error {
  const lines = error.issues.map((issue) => `${issue.path.join(".") || "file"}: ${issue.message}`);
  return new Error(`${where}: ${lines.join("; ")}`);
}

/** Checks that every "related" name points at a file that exists. */
export function checkRelated(
  items: readonly { slug: string; related: readonly string[] }[],
  folder: string,
) {
  const known = new Set(items.map((item) => item.slug));
  for (const item of items) {
    for (const other of item.related) {
      if (!known.has(other) || other === item.slug) {
        throw new Error(
          `content/${folder}/${item.slug}.md: related "${other}" isn't another file.`,
        );
      }
    }
  }
}
