import { describe, expect, it } from "vitest";

import { EnvError, looksLikeLiveKey, requireEnv, requireTestKey, requireUrl } from "./guards";

describe("requireEnv", () => {
  it("returns the value, trimmed", () => {
    expect(requireEnv("A", { A: "  value  " })).toBe("value");
  });

  it.each([{}, { A: "" }, { A: "   " }, { A: undefined }])(
    "names the missing key and where it belongs (%j)",
    (source) => {
      expect(() => requireEnv("A", source)).toThrow(EnvError);
      expect(() => requireEnv("A", source)).toThrow(/^A is not set\. Add it to \.env\.local/);
    },
  );
});

describe("looksLikeLiveKey", () => {
  it.each([
    "sk_live_4f9a8b7c6d5e",
    "pk_live_4f9a8b7c6d5e",
    "SK_LIVE_ABC",
    "FLWSECK-live-123",
    "key_prod_123",
    "abc-production-123",
    "live_abc",
  ])("flags %s", (key) => {
    expect(looksLikeLiveKey(key)).toBe(true);
  });

  it.each([
    "sk_test_4f9a8b7c6d5e",
    "pk_test_4f9a8b7c6d5e",
    "sandbox_abc123",
    "sb_secret_abc123",
    "sb_publishable_abc123",
    "olivexyz",
    "deliverable123",
    "reproduce",
  ])("allows %s", (key) => {
    expect(looksLikeLiveKey(key)).toBe(false);
  });
});

describe("requireTestKey", () => {
  it("returns a test key", () => {
    expect(requireTestKey("PAYSTACK_SECRET_KEY", { PAYSTACK_SECRET_KEY: "sk_test_abc" })).toBe(
      "sk_test_abc",
    );
  });

  it("refuses a live key without repeating it", () => {
    const source = { PAYSTACK_SECRET_KEY: "sk_live_supersecret" };
    expect(() => requireTestKey("PAYSTACK_SECRET_KEY", source)).toThrow(EnvError);
    try {
      requireTestKey("PAYSTACK_SECRET_KEY", source);
    } catch (error) {
      expect((error as Error).message).toContain("PAYSTACK_SECRET_KEY looks like a live key");
      expect((error as Error).message).not.toContain("supersecret");
    }
  });

  it("still reports a missing key first", () => {
    expect(() => requireTestKey("X", {})).toThrow("X is not set");
  });
});

describe("requireUrl", () => {
  it("accepts https and local http addresses", () => {
    expect(requireUrl("U", { U: "https://abc.supabase.co" })).toBe("https://abc.supabase.co");
    expect(requireUrl("U", { U: "http://localhost:54321" })).toBe("http://localhost:54321");
  });

  it.each(["abc.supabase.co", "not a url", "ftp://example.com", "javascript:alert(1)"])(
    "refuses %s",
    (value) => {
      expect(() => requireUrl("U", { U: value })).toThrow("U must be a full web address");
    },
  );

  it("reports a missing address", () => {
    expect(() => requireUrl("U", {})).toThrow("U is not set");
  });
});
