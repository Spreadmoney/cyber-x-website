import { describe, expect, it } from "vitest";

import { readAddresses } from "./addresses";

const APP = "https://cyber-x-eosin.vercel.app";
const SITE = "https://cyber-x-website-chi.vercel.app";

describe("readAddresses", () => {
  it("uses the two local previews on a laptop", () => {
    expect(readAddresses({})).toEqual({
      appUrl: "http://localhost:3000",
      websiteUrl: "http://localhost:3001",
    });
  });

  it("reads both addresses and keeps the address alone", () => {
    expect(readAddresses({ APP_URL: `${APP}/`, WEBSITE_URL: ` ${SITE} ` })).toEqual({
      appUrl: APP,
      websiteUrl: SITE,
    });
  });

  it("needs both addresses on Vercel", () => {
    expect(() => readAddresses({ VERCEL: "1", WEBSITE_URL: SITE })).toThrow(/APP_URL is not set/);
    expect(() => readAddresses({ VERCEL: "1", APP_URL: APP })).toThrow(/WEBSITE_URL is not set/);
    expect(readAddresses({ VERCEL: "1", APP_URL: APP, WEBSITE_URL: SITE })).toEqual({
      appUrl: APP,
      websiteUrl: SITE,
    });
  });

  it("refuses localhost on Vercel", () => {
    expect(() =>
      readAddresses({ VERCEL: "1", APP_URL: "http://localhost:3000", WEBSITE_URL: SITE }),
    ).toThrow(/localhost/);
  });

  it.each([
    "http://cyber-x-eosin.vercel.app",
    "ftp://cyber-x-eosin.vercel.app",
    "javascript:alert(1)",
  ])("refuses an address that isn't https: %s", (value) => {
    expect(() => readAddresses({ APP_URL: value })).toThrow(/https/);
  });

  it.each(["not an address", "cyber-x-eosin.vercel.app"])(
    "refuses something that isn't a web address: %s",
    (value) => {
      expect(() => readAddresses({ APP_URL: value })).toThrow(/full web address|https/);
    },
  );

  it.each([`${APP}/sign-in`, `${APP}?next=/home`, `${APP}#top`, "https://user@example.vercel.app"])(
    "refuses anything after the name: %s",
    (value) => {
      expect(() => readAddresses({ APP_URL: value })).toThrow(/address alone/);
    },
  );

  it("refuses the same address twice", () => {
    expect(() => readAddresses({ APP_URL: APP, WEBSITE_URL: APP })).toThrow(/different/);
  });
});
