// Copied from Codebase (src/config/countries/countries.test.ts) by `npm run sync:shared`. Change it there, then sync. Never edit it here.

import { describe, expect, it } from "vitest";

import { formatMoney } from "@/lib/money";

import {
  DEFAULT_COUNTRY,
  getCountryPack,
  getTier,
  isCountryCode,
  SUPPORTED_COUNTRIES,
  type CountryPack,
} from "./index";

describe("country packs", () => {
  it("launches in Nigeria", () => {
    expect(DEFAULT_COUNTRY).toBe("NG");
    expect(SUPPORTED_COUNTRIES).toEqual(["NG"]);
    expect(getCountryPack().name).toBe("Nigeria");
    expect(getCountryPack("NG").code).toBe("NG");
  });

  it("recognises only the countries it supports", () => {
    expect(isCountryCode("NG")).toBe(true);
    expect(isCountryCode("GB")).toBe(false);
    expect(isCountryCode("toString")).toBe(false);
  });

  it.each(SUPPORTED_COUNTRIES)("%s is internally consistent", (code) => {
    const pack = getCountryPack(code);
    expect(pack.code).toBe(code);
    expect(pack.currency.code).toMatch(/^[A-Z]{3}$/);
    expect(pack.phone.dialCode).toMatch(/^\+\d{1,3}$/);
    // The reading groups add up to the whole number, and the example is a real mobile shape.
    expect(pack.phone.groups.reduce((sum, size) => sum + size, 0)).toBe(
      pack.phone.nationalNumberLength,
    );
    expect(pack.phone.example).toMatch(new RegExp(`^\\d{${pack.phone.nationalNumberLength}}$`));
    expect(pack.phone.mobilePrefixes.some((prefix) => pack.phone.example.startsWith(prefix))).toBe(
      true,
    );
    expect(pack.tiers.map((tier) => tier.id)).toEqual([1, 2, 3]);

    // Each level must allow at least as much as the one below it.
    for (let index = 1; index < pack.tiers.length; index += 1) {
      const lower = pack.tiers[index - 1]!;
      const higher = pack.tiers[index]!;
      expect(higher.dailyLimit).toBeGreaterThan(lower.dailyLimit);
      if (higher.maxBalance !== null) {
        expect(lower.maxBalance).not.toBeNull();
        expect(higher.maxBalance).toBeGreaterThan(lower.maxBalance!);
      }
    }

    for (const tier of pack.tiers) {
      expect(Number.isSafeInteger(tier.dailyLimit)).toBe(true);
      expect(tier.requirements.length).toBeGreaterThan(0);
      expect(tier.summary).not.toBe("");
    }
  });
});

describe("Nigeria", () => {
  const pack = getCountryPack("NG");
  const money = (kobo: number) => formatMoney(kobo, pack.currency);

  it("uses naira and kobo", () => {
    expect(pack.currency).toMatchObject({ code: "NGN", symbol: "₦", decimals: 2 });
    expect(money(125_000_000)).toBe("₦1,250,000.00");
  });

  // These figures are set by the Central Bank of Nigeria. If this test fails,
  // someone changed a regulated limit: check the CBN rule before touching it.
  it.each([
    [1, "₦50,000.00", "₦300,000.00"],
    [2, "₦200,000.00", "₦500,000.00"],
    [3, "₦5,000,000.00", null],
  ] as const)("Tier %i sends up to %s a day and holds up to %s", (id, daily, balance) => {
    const tier = getTier(pack, id);
    expect(money(tier.dailyLimit)).toBe(daily);
    expect(tier.maxBalance === null ? null : money(tier.maxBalance)).toBe(balance);
  });

  it("asks for the right things at each level, in the words on the screen", () => {
    expect(getTier(pack, 1).summary).toBe("NIN and a selfie");
    expect(getTier(pack, 1).requirements).toEqual(["national_id_number", "selfie"]);

    expect(getTier(pack, 2).summary).toBe("BVN and a few questions");
    expect(getTier(pack, 2).requirements).toEqual(["bank_id_number", "account_questions"]);

    // Tier 3 is full verification: an ID document and proof of address.
    expect(getTier(pack, 3).summary).toBe("ID and proof of address");
    expect(getTier(pack, 3).requirements).toEqual([
      "id_document",
      "proof_of_address",
      "source_of_funds",
    ]);
  });

  it("knows NIN and BVN as 11-digit numbers", () => {
    expect(pack.identity.nationalIdNumber).toEqual({ name: "NIN", digits: 11 });
    expect(pack.identity.bankIdNumber).toEqual({ name: "BVN", digits: 11 });
  });

  it("caps a new phone at ₦20,000.00 for 24 hours", () => {
    expect(money(pack.newDeviceCap.amount)).toBe("₦20,000.00");
    expect(pack.newDeviceCap.hours).toBe(24);
  });

  it("uses +234 and ten-digit numbers", () => {
    expect(pack.phone).toEqual({
      dialCode: "+234",
      nationalNumberLength: 10,
      groups: [3, 3, 4],
      mobilePrefixes: ["70", "80", "81", "90", "91"],
      example: "8012345678",
    });
  });

  it("names its regulator", () => {
    expect(pack.regulator.shortName).toBe("CBN");
  });
});

describe("getTier", () => {
  it("fails loudly for a level a country does not have", () => {
    const twoLevels: CountryPack = {
      ...getCountryPack("NG"),
      tiers: getCountryPack("NG").tiers.slice(0, 2),
    };
    expect(() => getTier(twoLevels, 3)).toThrow("Nigeria has no verification level 3.");
  });
});
