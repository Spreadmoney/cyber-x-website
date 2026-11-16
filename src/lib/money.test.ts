// Copied from Codebase (src/lib/money.test.ts) by `npm run sync:shared`. Change it there, then sync. Never edit it here.

import { describe, expect, it } from "vitest";

import {
  addMoney,
  assertMinorUnits,
  type Currency,
  formatMoney,
  MoneyError,
  parseMoney,
  subtractMoney,
} from "./money";

const NGN: Currency = {
  code: "NGN",
  symbol: "₦",
  decimals: 2,
  groupSeparator: ",",
  decimalSeparator: ".",
};

/** A currency with no minor unit, to prove nothing assumes two decimals. */
const WHOLE: Currency = {
  code: "XXX",
  symbol: "¤",
  decimals: 0,
  groupSeparator: " ",
  decimalSeparator: ",",
};

describe("formatMoney", () => {
  it.each([
    [0, "₦0.00"],
    [1, "₦0.01"],
    [10, "₦0.10"],
    [100, "₦1.00"],
    [99_999, "₦999.99"],
    [100_000, "₦1,000.00"],
    [1_050_000, "₦10,500.00"],
    [125_000_000, "₦1,250,000.00"],
    [500_000_000, "₦5,000,000.00"],
    [123_456_789_012, "₦1,234,567,890.12"],
  ])("shows %i kobo as %s", (kobo, expected) => {
    expect(formatMoney(kobo, NGN)).toBe(expected);
  });

  it("always shows kobo, even when there are none", () => {
    expect(formatMoney(2_000_000, NGN)).toBe("₦20,000.00");
  });

  it("marks money out with a real minus sign and a space", () => {
    expect(formatMoney(-1_500_000, NGN)).toBe("− ₦15,000.00");
  });

  it("marks money in only when asked", () => {
    expect(formatMoney(2_500_000, NGN)).toBe("₦25,000.00");
    expect(formatMoney(2_500_000, NGN, { sign: "always" })).toBe("+ ₦25,000.00");
  });

  it("can hide the sign", () => {
    expect(formatMoney(-1_500_000, NGN, { sign: "never" })).toBe("₦15,000.00");
  });

  it("never signs zero", () => {
    expect(formatMoney(0, NGN, { sign: "always" })).toBe("₦0.00");
    expect(formatMoney(-0, NGN)).toBe("₦0.00");
  });

  it("follows the currency it is given, not naira", () => {
    expect(formatMoney(1_250_000, WHOLE)).toBe("¤1 250 000");
  });

  it.each([0.5, 10.01, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    "refuses %s because it is not a whole number of kobo",
    (bad) => {
      expect(() => formatMoney(bad, NGN)).toThrow(MoneyError);
    },
  );
});

describe("parseMoney", () => {
  it.each([
    ["0", 0],
    ["5000", 500_000],
    ["5,000", 500_000],
    ["5000.5", 500_050],
    ["5000.50", 500_050],
    ["0.01", 1],
    ["1,250,000.00", 125_000_000],
    ["₦1,250,000.00", 125_000_000],
    ["₦ 20,000", 2_000_000],
    ["  750  ", 75_000],
    ["007", 700],
  ])("reads %j as %i kobo", (text, expected) => {
    expect(parseMoney(text, NGN)).toBe(expected);
  });

  it.each([
    "",
    "   ",
    "abc",
    "12a",
    "-500",
    "−500",
    "+500",
    "5000.123",
    "5000.",
    ".50",
    "5.0.0",
    "12,50",
    "1,2500",
    ",500",
    "5,000,",
    "1 000",
    "5e3",
    "0x10",
    "99999999999999999999",
  ])("refuses %j", (text) => {
    expect(parseMoney(text, NGN)).toBeNull();
  });

  it("refuses decimals for a currency that has none", () => {
    expect(parseMoney("1 250", WHOLE)).toBe(1250);
    expect(parseMoney("1250,5", WHOLE)).toBeNull();
  });

  it("round-trips with formatMoney", () => {
    for (const kobo of [0, 1, 99, 100, 123_456, 125_000_000, 500_000_000]) {
      expect(parseMoney(formatMoney(kobo, NGN), NGN)).toBe(kobo);
    }
  });
});

describe("addMoney and subtractMoney", () => {
  it("adds exactly where decimals would drift", () => {
    // 0.1 + 0.2 is not 0.3 in floating point; 10 + 20 kobo is always 30.
    expect(addMoney(10, 20)).toBe(30);
    expect(addMoney(2_500_000, 1_000)).toBe(2_501_000);
    expect(addMoney()).toBe(0);
  });

  it("subtracts exactly and may go below zero for the caller to judge", () => {
    expect(subtractMoney(2_501_000, 1_000)).toBe(2_500_000);
    expect(subtractMoney(100, 250)).toBe(-150);
  });

  it("refuses fractions of a kobo", () => {
    expect(() => addMoney(100, 0.5)).toThrow(MoneyError);
    expect(() => subtractMoney(100.5, 1)).toThrow(MoneyError);
    expect(() => subtractMoney(100, Number.NaN)).toThrow(MoneyError);
  });

  it("refuses totals too large to hold exactly", () => {
    expect(() => addMoney(Number.MAX_SAFE_INTEGER, 1)).toThrow(MoneyError);
    expect(() => subtractMoney(-Number.MAX_SAFE_INTEGER, 1)).toThrow(MoneyError);
  });
});

describe("assertMinorUnits", () => {
  it("accepts whole numbers and names the field it refuses", () => {
    expect(() => assertMinorUnits(100)).not.toThrow();
    expect(() => assertMinorUnits("100", "fee")).toThrow("The fee must be a whole number");
  });
});
