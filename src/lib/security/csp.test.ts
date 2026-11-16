import { describe, expect, it } from "vitest";

import { buildCsp, newNonce } from "./csp";

const NONCE = "dGVzdC1ub25jZS0xMjM0NQ==";

function directive(policy: string, name: string): string[] {
  const part = policy.split("; ").find((entry) => entry.startsWith(`${name} `));
  if (!part) throw new Error(`${name} is missing`);
  return part.split(" ").slice(1);
}

describe("buildCsp", () => {
  it("lets only scripts with this visit's key run", () => {
    const scripts = directive(buildCsp({ nonce: NONCE }), "script-src");
    expect(scripts).toEqual(["'self'", `'nonce-${NONCE}'`, "'strict-dynamic'"]);
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
  });

  it("allows eval only in the development preview", () => {
    expect(directive(buildCsp({ nonce: NONCE, development: true }), "script-src")).toContain(
      "'unsafe-eval'",
    );
  });

  it("lets pages talk to the website only", () => {
    expect(directive(buildCsp({ nonce: NONCE }), "connect-src")).toEqual(["'self'"]);
  });

  it("refuses framing, plugins, other base addresses and forms sent elsewhere", () => {
    const policy = buildCsp({ nonce: NONCE });
    expect(directive(policy, "frame-ancestors")).toEqual(["'none'"]);
    expect(directive(policy, "frame-src")).toEqual(["'none'"]);
    expect(directive(policy, "object-src")).toEqual(["'none'"]);
    expect(directive(policy, "base-uri")).toEqual(["'none'"]);
    expect(directive(policy, "form-action")).toEqual(["'self'"]);
  });

  it("loads fonts and images from the website only", () => {
    const policy = buildCsp({ nonce: NONCE });
    expect(directive(policy, "font-src")).toEqual(["'self'"]);
    expect(directive(policy, "img-src")).toEqual(["'self'", "data:", "blob:"]);
  });

  it.each(["", "short", "has spaces in it!!", "<script>alert(1)</script>"])(
    "refuses a weak or unsafe nonce: %j",
    (nonce) => {
      expect(() => buildCsp({ nonce })).toThrow(/nonce/);
    },
  );
});

describe("newNonce", () => {
  it("is 128 random bits, new every time", () => {
    const nonces = new Set(Array.from({ length: 200 }, () => newNonce()));
    expect(nonces.size).toBe(200);
    for (const nonce of nonces) {
      expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
      expect(() => buildCsp({ nonce })).not.toThrow();
    }
  });
});
