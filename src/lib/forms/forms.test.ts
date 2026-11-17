import { describe, expect, it } from "vitest";

import { fits, isEmail, isPastDate, isReplyAddress, summary, text } from "./rules";

describe("form rules (W7)", () => {
  it("reads text, trimmed and capped just past its limit", () => {
    expect(text("  hello  ", 10)).toBe("hello");
    expect(text("x".repeat(50), 10)).toHaveLength(11);
    expect(text(null, 10)).toBe("");
    expect(text(new File([], "a.png"), 10)).toBe("");
    expect(fits("hello", 1, 5)).toBe(true);
    expect(fits("", 1, 5)).toBe(false);
  });

  it("takes an email or a phone number to reply to", () => {
    expect(isReplyAddress("ada@example.com")).toBe(true);
    expect(isReplyAddress("0801 234 5678")).toBe(true);
    expect(isReplyAddress("+234 803 000 0001")).toBe(true);
    expect(isReplyAddress("ada@example")).toBe(false);
    expect(isReplyAddress("@ada")).toBe(false);
    expect(isEmail("a b@example.com")).toBe(false);
  });

  it("takes a real day, today or before", () => {
    const today = new Date("2026-11-17T12:00:00Z");
    expect(isPastDate("2026-11-17", today)).toBe(true);
    expect(isPastDate("2026-11-18", today)).toBe(false);
    expect(isPastDate("2026-02-30", today)).toBe(false);
    expect(isPastDate("2019-12-31", today)).toBe(false);
    expect(isPastDate("17/11/2026", today)).toBe(false);
  });

  it("says how many things need fixing, in words", () => {
    expect(summary(["choose what happened"])).toBe("One thing needs fixing: choose what happened.");
    expect(summary(["choose what happened", "tell us a little about it"])).toBe(
      "Two things need fixing: choose what happened, and tell us a little about it.",
    );
    expect(summary(["a", "b", "c"])).toBe("Three things need fixing: a, b, and c.");
  });
});
