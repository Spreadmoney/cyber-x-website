import { describe, expect, it } from "vitest";

import { checkEnvironment, refuseLiveKeys } from "./startup";

describe("refuseLiveKeys", () => {
  it.each([
    ["PAYSTACK_SECRET_KEY", "sk_live_abc123"],
    ["NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY", "pk_live_abc123"],
    ["SOME_API_TOKEN", "tok-production-9"],
    ["BOT_CHECK_SECRET", "x_prod_y"],
  ])("refuses a live-looking %s without showing it", (name, value) => {
    expect(() => refuseLiveKeys({ [name]: value })).toThrow(name);
    try {
      refuseLiveKeys({ [name]: value });
    } catch (error) {
      expect(String(error)).not.toContain(value);
    }
  });

  it("accepts test keys and ignores settings that aren't keys", () => {
    expect(() =>
      refuseLiveKeys({
        PAYSTACK_SECRET_KEY: "sk_test_abc123",
        NODE_ENV: "production",
        APP_URL: "https://cyber-x-eosin.vercel.app",
        EMPTY_KEY: "",
      }),
    ).not.toThrow();
  });

  it("leaves Vercel's own settings to Vercel", () => {
    expect(() => refuseLiveKeys({ VERCEL_OIDC_TOKEN: "a_prod_b" })).not.toThrow();
  });
});

describe("checkEnvironment", () => {
  it("passes on a laptop with nothing set", () => {
    expect(() => checkEnvironment({})).not.toThrow();
  });

  it("stops on a bad address or a live key", () => {
    expect(() => checkEnvironment({ APP_URL: "http://example.com" })).toThrow(/APP_URL/);
    expect(() => checkEnvironment({ PAYSTACK_SECRET_KEY: "sk_live_1" })).toThrow(
      /PAYSTACK_SECRET_KEY/,
    );
  });
});
