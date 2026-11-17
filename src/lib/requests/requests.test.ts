import { describe, expect, it } from "vitest";

import {
  REQUEST_PREVIEWS,
  appRequestUrl,
  firstName,
  initials,
  isRequestCode,
  readRequest,
  requestPreview,
} from "./rules";

describe("payment request links (W5)", () => {
  it("knows a link's code when it sees one", () => {
    expect(isRequestCode("k7Q2mX9pLw")).toBe(true);
    expect(isRequestCode("short")).toBe(false);
    expect(isRequestCode("k7Q2mX9pLw-x")).toBe(false);
    expect(isRequestCode("a".repeat(17))).toBe(false);
    expect(isRequestCode(12345678)).toBe(false);
  });

  it("calls no link real until the app makes requests", async () => {
    expect(await readRequest("k7Q2mX9pLw")).toEqual({ state: "not_real" });
    expect(await readRequest("../../etc")).toEqual({ state: "not_real" });
  });

  it("names people the way the page does", () => {
    expect(firstName("Chidi Eze")).toBe("Chidi");
    expect(initials("Chidi Eze")).toBe("CE");
    expect(initials("Maryam")).toBe("M");
    expect(initials("ada  lovelace byron")).toBe("AB");
  });

  it("opens the same code in the app", () => {
    expect(appRequestUrl("https://cyber-x-eosin.vercel.app", "k7Q2mX9pLw")).toBe(
      "https://cyber-x-eosin.vercel.app/r/k7Q2mX9pLw",
    );
  });

  it("shows the Figma examples only where previews are on", () => {
    expect(requestPreview("paid", "on")).toBe(REQUEST_PREVIEWS.paid);
    expect(requestPreview("paid", undefined)).toBeNull();
    expect(requestPreview("constructor", "on")).toBeNull();
    expect(requestPreview(["paid"], "on")).toBeNull();
  });
});
