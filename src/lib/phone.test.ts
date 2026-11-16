// Copied from Codebase (src/lib/phone.test.ts) by `npm run sync:shared`. Change it there, then sync. Never edit it here.

import { describe, expect, it } from "vitest";

import { getCountryPack } from "@/config/countries";

import {
  caretAfterDigits,
  formatNationalNumber,
  fromInternationalNumber,
  isCompletePhoneNumber,
  maskPhoneNumber,
  parsePhoneInput,
  phoneNumberError,
  toInternationalNumber,
  toNationalNumber,
} from "./phone";

const NG = getCountryPack("NG");
const format = NG.phone;

describe("toNationalNumber: every way people write a Nigerian number", () => {
  it.each([
    ["8012345678", "8012345678"],
    ["801 234 5678", "8012345678"],
    ["0801 234 5678", "8012345678"],
    ["08012345678", "8012345678"],
    ["+234 801 234 5678", "8012345678"],
    ["+2348012345678", "8012345678"],
    ["+234 0801 234 5678", "8012345678"],
    ["002348012345678", "8012345678"],
    ["2348012345678", "8012345678"],
    ["(0801) 234-5678", "8012345678"],
    ["  0801.234.5678  ", "8012345678"],
  ])("%s → %s", (typed, expected) => {
    expect(toNationalNumber(typed, format)).toBe(expected);
  });

  it("never keeps more digits than a number has", () => {
    expect(toNationalNumber("080123456789999", format)).toBe("8012345678");
  });

  it("drops a 0 typed first, so typing 0801… digit by digit works", () => {
    expect(toNationalNumber("0", format)).toBe("");
    expect(toNationalNumber("08", format)).toBe("8");
    expect(toNationalNumber("080", format)).toBe("80");
  });

  it("keeps letters and symbols out", () => {
    expect(toNationalNumber("abc", format)).toBe("");
    expect(toNationalNumber("", format)).toBe("");
    expect(toNationalNumber("+", format)).toBe("");
  });

  it("does not mistake a short number starting 234 for the dialling code", () => {
    // Only a plus sign, 00, or a number too long to be national marks a dialling code.
    expect(toNationalNumber("2348", format)).toBe("2348");
  });

  it("does not strip the dialling code after a plus sign when it isn't there", () => {
    expect(toNationalNumber("+44 7700 900123", format)).toBe("4477009001");
  });

  it("reports how many digits it dropped from the front", () => {
    expect(parsePhoneInput("0801", format)).toEqual({ digits: "801", droppedFromFront: 1 });
    expect(parsePhoneInput("+234801", format)).toEqual({ digits: "801", droppedFromFront: 3 });
    expect(parsePhoneInput("00234801", format)).toEqual({ digits: "801", droppedFromFront: 5 });
    expect(parsePhoneInput("801", format)).toEqual({ digits: "801", droppedFromFront: 0 });
  });
});

describe("formatNationalNumber", () => {
  it.each([
    ["", ""],
    ["8", "8"],
    ["801", "801"],
    ["8012", "801 2"],
    ["801234", "801 234"],
    ["8012345", "801 234 5"],
    ["8012345678", "801 234 5678"],
  ])("%s → %s", (digits, expected) => {
    expect(formatNationalNumber(digits, format)).toBe(expected);
  });

  it("matches the Figma placeholder for the country's example number", () => {
    expect(formatNationalNumber(format.example, format)).toBe("801 234 5678");
  });
});

describe("isCompletePhoneNumber", () => {
  it.each(["7012345678", "8012345678", "8112345678", "9012345678", "9112345678"])(
    "accepts %s (every network prefix)",
    (digits) => {
      expect(isCompletePhoneNumber(digits, format)).toBe(true);
    },
  );

  it.each([
    ["", "empty"],
    ["801234567", "one digit short"],
    ["80123456789", "one digit long"],
    ["1012345678", "not a mobile prefix"],
    ["6012345678", "not a mobile prefix"],
    ["8212345678", "82 is not a mobile prefix"],
    ["801234567a", "a letter"],
  ])("refuses %s (%s)", (digits) => {
    expect(isCompletePhoneNumber(digits, format)).toBe(false);
  });
});

describe("phoneNumberError", () => {
  it("is quiet while the field is empty or the number could still be right", () => {
    for (const digits of ["", "8", "80", "801", "7", "9", "91234", "8012345678"]) {
      expect(phoneNumberError(digits, format, NG.name)).toBeNull();
    }
  });

  it("speaks up at the first digit that can't start a mobile number", () => {
    expect(phoneNumberError("1", format, NG.name)).toBe("This isn’t a mobile number in Nigeria.");
    expect(phoneNumberError("82", format, NG.name)).toBe("This isn’t a mobile number in Nigeria.");
    expect(phoneNumberError("6012345678", format, NG.name)).not.toBeNull();
  });
});

describe("toInternationalNumber", () => {
  it("adds the dialling code for the server", () => {
    expect(toInternationalNumber("8012345678", format)).toBe("+2348012345678");
  });

  it("refuses an incomplete or non-mobile number", () => {
    expect(() => toInternationalNumber("801234", format)).toThrow(/not complete/);
    expect(() => toInternationalNumber("1012345678", format)).toThrow(/not complete/);
  });
});

describe("caretAfterDigits", () => {
  it("puts the cursor just after the same digit once the spaces move", () => {
    expect(caretAfterDigits("801 234 5678", 0)).toBe(0);
    expect(caretAfterDigits("801 234 5678", 3)).toBe(3);
    expect(caretAfterDigits("801 234 5678", 4)).toBe(5);
    expect(caretAfterDigits("801 234 5678", 10)).toBe(12);
  });

  it("goes to the end when asked for more digits than there are", () => {
    expect(caretAfterDigits("801 2", 9)).toBe(5);
  });
});

describe("maskPhoneNumber", () => {
  const { phone } = getCountryPack("NG");

  it("hides the middle of the number, as on the code screen", () => {
    expect(maskPhoneNumber("8012345678", phone)).toBe("+234 801 •••• 678");
  });

  it("never shows the hidden digits", () => {
    expect(maskPhoneNumber("8012345678", phone)).not.toContain("2345");
  });
});

describe("fromInternationalNumber", () => {
  const { phone } = getCountryPack("NG");

  it("gives back the national digits of a stored number", () => {
    expect(fromInternationalNumber("+2348012345678", phone)).toBe("8012345678");
  });

  it("is null for another country's number or a broken one", () => {
    expect(fromInternationalNumber("+233201234567", phone)).toBeNull();
    expect(fromInternationalNumber("+23480123", phone)).toBeNull();
    expect(fromInternationalNumber("+2345012345678", phone)).toBeNull();
  });
});
