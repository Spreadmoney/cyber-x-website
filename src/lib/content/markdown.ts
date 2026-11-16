/**
 * Reads the blog and help files (content/blog, content/help). They are
 * plain text with a few marks, so a new post needs no code:
 *
 *   ---
 *   title: How do I freeze my account?
 *   ---
 *   A paragraph, with a [link](/freeze).
 *
 *   ## A heading
 *   > A blue note.          > ! An amber note.
 *   1. A step :: what it means
 *   - 0:40 :: A row with a label
 *   - A bullet
 *
 * Nothing in a file becomes HTML: every part is drawn by React, and links
 * may only go to this website or to an https address.
 */

export type Inline = { text: string; href?: string };

export type Block =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; content: Inline[] }
  | { kind: "note"; tone: "blue" | "amber"; content: Inline[] }
  | { kind: "steps"; items: { title: Inline[]; text?: Inline[] }[] }
  | { kind: "rows"; items: { label: string; text: Inline[] }[] }
  | { kind: "list"; items: Inline[][] };

export interface Document {
  data: Record<string, string>;
  blocks: Block[];
}

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseInline(text: string): Inline[] {
  const parts: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    const [whole, label, href] = match as unknown as [string, string, string];
    if (!/^(\/|#|https:\/\/)/.test(href)) {
      throw new Error(`Links may only go to this website or an https address: ${href}`);
    }
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    parts.push({ text: label, href });
    last = match.index + whole.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

function splitPair(line: string): [string, string | undefined] {
  const at = line.indexOf(" :: ");
  return at === -1
    ? [line.trim(), undefined]
    : [line.slice(0, at).trim(), line.slice(at + 4).trim()];
}

function readBlock(lines: string[]): Block {
  const every = (pattern: RegExp) => lines.every((line) => pattern.test(line));
  if (lines.length === 1 && lines[0]!.startsWith("## ")) {
    return { kind: "heading", text: lines[0]!.slice(3).trim() };
  }
  if (every(/^>/)) {
    // "> !" marks a warning (Prettier writes ">!" that way).
    const text = lines.map((line) => line.replace(/^>\s?/, "")).join(" ");
    const amber = /^!\s*/.test(text);
    return {
      kind: "note",
      tone: amber ? "amber" : "blue",
      content: parseInline(text.replace(/^!\s*/, "")),
    };
  }
  if (every(/^\d+\. /)) {
    return {
      kind: "steps",
      items: lines.map((line) => {
        const [title, text] = splitPair(line.replace(/^\d+\. /, ""));
        return { title: parseInline(title), ...(text ? { text: parseInline(text) } : {}) };
      }),
    };
  }
  if (every(/^- .+ :: /)) {
    return {
      kind: "rows",
      items: lines.map((line) => {
        const [label, text] = splitPair(line.slice(2));
        return { label, text: parseInline(text ?? "") };
      }),
    };
  }
  if (every(/^- /)) {
    return { kind: "list", items: lines.map((line) => parseInline(line.slice(2).trim())) };
  }
  return { kind: "paragraph", content: parseInline(lines.join(" ")) };
}

export function parseDocument(source: string): Document {
  const text = source.replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!match) throw new Error("A file must start with its details between two --- lines.");
  const data: Record<string, string> = {};
  for (const line of match[1]!.split("\n")) {
    if (!line.trim()) continue;
    const at = line.indexOf(":");
    if (at === -1) throw new Error(`A detail needs a name and a value: ${line}`);
    data[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  const blocks = text
    .slice(match[0].length)
    .split(/\n\s*\n/)
    .map((chunk) =>
      chunk
        .split("\n")
        .map((line) => line.trimEnd())
        .filter(Boolean),
    )
    .filter((lines) => lines.length > 0)
    .map(readBlock);
  return { data, blocks };
}

/** Every word a reader would read, for reading time and search. */
export function plainText(blocks: readonly Block[]): string {
  const join = (inline: readonly Inline[]) => inline.map((part) => part.text).join("");
  return blocks
    .map((block) => {
      switch (block.kind) {
        case "heading":
          return block.text;
        case "paragraph":
        case "note":
          return join(block.content);
        case "steps":
          return block.items
            .map((item) => `${join(item.title)} ${item.text ? join(item.text) : ""}`)
            .join(" ");
        case "rows":
          return block.items.map((item) => `${item.label} ${join(item.text)}`).join(" ");
        case "list":
          return block.items.map(join).join(" ");
      }
    })
    .join(" ");
}

/** Minutes at 200 words a minute, at least one. */
export function readingMinutes(blocks: readonly Block[]): number {
  const words = plainText(blocks).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "2026-11-14" → "14 Nov 2026", or "14 November 2026" in full. */
export function formatDate(iso: string, full = false): string {
  const [year, month, day] = iso.split("-").map(Number) as [number, number, number];
  const name = MONTHS[month - 1]!;
  return `${day} ${full ? name : name.slice(0, 3)} ${year}`;
}
