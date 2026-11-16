import { describe, expect, it } from "vitest";

import { extractTheme, findDrift, header, kindOf, sha256, transform } from "./core.mjs";

const CSS = `@import "tailwindcss";\n\n@theme {\n  --color-accent: #0a5cff;\n  @keyframes shake {\n    0% {\n      opacity: 1;\n    }\n  }\n}\n\nbody {\n  color: red;\n}\n`;

describe("extractTheme", () => {
  it("copies the whole @theme block, nested braces included, and nothing else", () => {
    const theme = extractTheme(CSS);
    expect(theme.startsWith("@theme {")).toBe(true);
    expect(theme).toContain("@keyframes shake");
    expect(theme).not.toContain("body");
    expect(theme).not.toContain("@import");
  });

  it("refuses a stylesheet with no theme, or an unclosed one", () => {
    expect(() => extractTheme("body {}")).toThrow(/no @theme/);
    expect(() => extractTheme("@theme { --a: 1;")).toThrow(/not closed/);
  });
});

describe("transform", () => {
  it("marks a code copy so nobody edits it here", () => {
    const out = transform({ from: "src/lib/alias.ts" }, Buffer.from("export const a = 1;\n"));
    expect(out.toString()).toBe(`${header("src/lib/alias.ts", "code")}export const a = 1;\n`);
    expect(out.toString()).toMatch(/^\/\/ Copied from Codebase \(src\/lib\/alias\.ts\)/);
  });

  it("writes the theme as a stylesheet with a stylesheet note", () => {
    const out = transform(
      { from: "src/app/globals.css", to: "src/shared/app-theme.css", extract: "theme" },
      Buffer.from(CSS),
    ).toString();
    expect(out.startsWith("/* Copied from Codebase (src/app/globals.css)")).toBe(true);
    expect(out).toContain("--color-accent: #0a5cff;");
    expect(out).not.toContain("body");
  });

  it("copies pictures exactly", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    expect(transform({ from: "src/app/apple-icon.png" }, png)).toEqual(png);
    expect(kindOf("src/app/icon.svg")).toBe("binary");
  });
});

describe("findDrift", () => {
  const list = [{ from: "src/lib/alias.ts" }];
  const source = Buffer.from("export const a = 1;\n");
  const copy = transform(list[0], source);
  const lock = {
    files: { "src/lib/alias.ts": { from: "src/lib/alias.ts", sha256: sha256(copy) } },
  };
  const reader = (value) => () => value;

  it("passes when the copy, the lock and Codebase agree", () => {
    expect(findDrift({ list, lock, readCopy: reader(copy), readSource: reader(source) })).toEqual(
      [],
    );
  });

  it("passes on GitHub and Vercel, where Codebase isn't, if nobody edited the copy", () => {
    expect(findDrift({ list, lock, readCopy: reader(copy), readSource: null })).toEqual([]);
  });

  it("fails when a copy was edited here", () => {
    const edited = Buffer.from(`${copy}// a quick fix\n`);
    expect(findDrift({ list, lock, readCopy: reader(edited), readSource: null })).toEqual([
      expect.stringMatching(/was edited here/),
    ]);
  });

  it("fails when the app changed since the last sync", () => {
    const changed = Buffer.from("export const a = 2;\n");
    expect(findDrift({ list, lock, readCopy: reader(copy), readSource: reader(changed) })).toEqual([
      expect.stringMatching(/changed in Codebase/),
    ]);
  });

  it("fails when a part is missing, never synced, gone from Codebase or no longer listed", () => {
    expect(findDrift({ list, lock, readCopy: reader(null), readSource: null })).toEqual([
      expect.stringMatching(/missing here/),
    ]);
    expect(
      findDrift({ list, lock: { files: {} }, readCopy: reader(copy), readSource: null }),
    ).toEqual([expect.stringMatching(/never been synced/)]);
    expect(findDrift({ list, lock, readCopy: reader(copy), readSource: reader(null) })).toEqual([
      expect.stringMatching(/no longer in Codebase/),
    ]);
    expect(findDrift({ list: [], lock, readCopy: reader(copy), readSource: null })).toEqual([
      expect.stringMatching(/not in the list/),
    ]);
  });
});
