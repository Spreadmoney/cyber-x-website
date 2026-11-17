import { describe, expect, it } from "vitest";

import { errorReference } from "./errorReference";
import { maintenanceBackBy, maintenanceOn, maintenanceRewrite } from "./maintenance";
import { platformFrom } from "./platform";
import { FOOTER, NAV, PAGES, href, isBuilt } from "./routes";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15";

describe("platformFrom", () => {
  it("knows an iPhone, an Android phone and everything else", () => {
    expect(platformFrom(IPHONE)).toBe("ios");
    expect(platformFrom(ANDROID)).toBe("android");
    expect(platformFrom(MAC)).toBe("other");
    expect(platformFrom("")).toBe("other");
    expect(platformFrom(null)).toBe("other");
    expect(platformFrom(undefined)).toBe("other");
  });
});

describe("errorReference", () => {
  const day = new Date(Date.UTC(2026, 10, 16, 12));

  it("takes four characters of the error's fingerprint and the date", () => {
    expect(errorReference("7f3a9c21", day)).toBe("ERR-7F3A-1611");
  });

  it("makes its own when there is no fingerprint", () => {
    expect(errorReference(undefined, day)).toMatch(/^ERR-[0-9A-F]{4}-1611$/);
    expect(errorReference("", day)).toMatch(/^ERR-[0-9A-F]{4}-1611$/);
  });

  it("keeps only letters and digits, and pads a short one", () => {
    expect(errorReference("a-b", day)).toBe("ERR-AB00-1611");
  });
});

describe("maintenance switch", () => {
  it("is off unless MAINTENANCE_MODE is on", () => {
    expect(maintenanceOn({})).toBe(false);
    expect(maintenanceOn({ MAINTENANCE_MODE: "off" })).toBe(false);
    expect(maintenanceOn({ MAINTENANCE_MODE: " ON " })).toBe(true);
  });

  it("sends every page to the maintenance page while on", () => {
    const on = { MAINTENANCE_MODE: "on" };
    expect(maintenanceRewrite("/", on)).toBe("/maintenance");
    expect(maintenanceRewrite("/get-the-app", on)).toBe("/maintenance");
    expect(maintenanceRewrite("/maintenance", on)).toBeNull();
    expect(maintenanceRewrite("/", {})).toBeNull();
  });

  it("shows the time it's back by, in words, if given", () => {
    expect(maintenanceBackBy({})).toBeNull();
    expect(maintenanceBackBy({ MAINTENANCE_BACK_BY: "  " })).toBeNull();
    expect(maintenanceBackBy({ MAINTENANCE_BACK_BY: "02:00, 17 November (Lagos time)" })).toBe(
      "02:00, 17 November (Lagos time)",
    );
    expect(maintenanceBackBy({ MAINTENANCE_BACK_BY: "x".repeat(200) })).toHaveLength(80);
  });
});

describe("routes", () => {
  it("gives every page one address, starting with /", () => {
    const addresses = Object.values(PAGES).map((page) => page.href);
    for (const address of addresses) expect(address.startsWith("/")).toBe(true);
    expect(new Set(addresses).size).toBe(addresses.length);
    expect(href("getTheApp")).toBe("/get-the-app");
  });

  it("links the menu bar and footer only to known pages", () => {
    const names = Object.keys(PAGES);
    for (const link of [...NAV, ...FOOTER.flatMap((column) => column.links)]) {
      expect(names).toContain(link.page);
    }
    expect(FOOTER.map((column) => column.title)).toEqual([
      "Individual",
      "Security",
      "Help",
      "Company",
      "Legal",
    ]);
  });
});

describe("isBuilt", () => {
  it("knows which pages exist yet", () => {
    expect(isBuilt("/")).toBe(true);
    expect(isBuilt("/get-the-app")).toBe(true);
    expect(isBuilt("/features")).toBe(true);
    expect(isBuilt("/about#team")).toBe(true);
    expect(isBuilt("/blog")).toBe(true);
    expect(isBuilt("/careers")).toBe(false);
    expect(isBuilt("/sign-in")).toBe(true);
    expect(isBuilt("/check")).toBe(true);
    expect(isBuilt("/report")).toBe(false);
    expect(isBuilt("/get-the-app?from=home")).toBe(true);
    expect(isBuilt("/maintenance")).toBe(true);
  });
});
