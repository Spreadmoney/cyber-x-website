import { describe, expect, it } from "vitest";

import { SERVICES, feeFor, isService, transferFee } from "./fees";

const naira = (amount: number) => amount * 100;

describe("transferFee (CBN 2026 bands)", () => {
  it.each([
    [0, 0],
    [5_000, 0],
    [5_000.01, 10],
    [25_000, 10],
    [50_000, 10],
    [50_000.01, 50],
    [5_000_000, 50],
  ])("₦%s costs ₦%s", (amount, fee) => {
    expect(transferFee(Math.round(amount * 100))).toBe(naira(fee));
  });
});

describe("feeFor", () => {
  it("adds the fee to the total", () => {
    expect(feeFor("withdraw", naira(25_000))).toEqual({ fee: naira(10), total: naira(25_010) });
    expect(feeFor("bill", naira(10_000))).toEqual({ fee: naira(50), total: naira(10_050) });
  });

  it("charges 0.5% for a card, rounded to the kobo, and nothing for a transfer in", () => {
    expect(feeFor("addCard", naira(10_000)).fee).toBe(naira(50));
    expect(feeFor("addCard", 333).fee).toBe(2);
    expect(feeFor("addTransfer", naira(1_000_000)).fee).toBe(0);
    expect(feeFor("airtime", naira(500)).fee).toBe(0);
  });

  it("refuses amounts that aren't whole kobo", () => {
    expect(() => feeFor("send", -1)).toThrow(RangeError);
    expect(() => feeFor("send", 1.5)).toThrow(RangeError);
  });

  it("knows its services by name", () => {
    expect(isService("send")).toBe(true);
    expect(isService("crypto")).toBe(false);
    expect(Object.keys(SERVICES)).toHaveLength(6);
  });
});
