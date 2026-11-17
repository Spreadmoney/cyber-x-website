import { describe, expect, it } from "vitest";

import { checkPayment } from "./actions";
import { CHECK_MESSAGES, PREVIEWS, normaliseReference, previewOf, readCheck } from "./rules";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

describe("reading a check", () => {
  it("takes a reference as receipts print it, and the amount in naira", () => {
    expect(readCheck(" dx-7741-0912 ", "₦25,000.00")).toEqual({
      ok: true,
      input: { reference: "DX-7741-0912", amount: 2_500_000 },
    });
    expect(readCheck("DX 7741 0912", "25000")).toMatchObject({
      ok: true,
      input: { reference: "DX77410912", amount: 2_500_000 },
    });
  });

  it("says what to fix in each field", () => {
    expect(readCheck("", "")).toEqual({
      ok: false,
      errors: { reference: CHECK_MESSAGES.reference, amount: CHECK_MESSAGES.amount },
    });
    expect(readCheck("ABCDEFGH", "25,000")).toMatchObject({
      errors: { reference: expect.any(String) },
    });
    expect(readCheck("DX-7741-0912-", "25,000")).toMatchObject({
      errors: { reference: expect.any(String) },
    });
    expect(readCheck("DX-77", "25,000")).toMatchObject({
      errors: { reference: expect.any(String) },
    });
    for (const amount of ["0", "-5", "12,50", "₦1,000,000,000.00", "x".repeat(40), "1.234"]) {
      expect(readCheck("DX-7741-0912", amount)).toMatchObject({
        errors: { amount: CHECK_MESSAGES.amount },
      });
    }
  });

  it("refuses anything but text", () => {
    expect(normaliseReference(42)).toBe("");
    expect(readCheck(["DX-7741-0912"], 25000)).toMatchObject({ ok: false });
  });
});

describe("checking a payment before Cyber X payments are live", () => {
  it("says checks start soon, never that a receipt is fake", async () => {
    expect(
      await checkPayment({ step: "form" }, form({ reference: "dx-7741-0912", amount: "25000" })),
    ).toEqual({ step: "not_live", reference: "DX-7741-0912", amount: "₦25,000.00" });
  });

  it("gives back what was typed, with what to fix", async () => {
    expect(await checkPayment({ step: "form" }, form({ reference: "nope", amount: "" }))).toEqual({
      step: "form",
      errors: { reference: CHECK_MESSAGES.reference, amount: CHECK_MESSAGES.amount },
      reference: "nope",
      amount: "",
    });
    expect(await checkPayment({ step: "form" }, new FormData())).toMatchObject({
      step: "form",
      reference: "",
      amount: "",
    });
  });
});

describe("previews", () => {
  it("show the Figma examples only where previews are on", () => {
    expect(previewOf("real", "on")).toBe(PREVIEWS.real);
    expect(previewOf("not_found", "on")).toBe(PREVIEWS.not_found);
    expect(previewOf("real", undefined)).toBeNull();
    expect(previewOf("real", "off")).toBeNull();
    expect(previewOf("toString", "on")).toBeNull();
    expect(previewOf(["real"], "on")).toBeNull();
  });
});
