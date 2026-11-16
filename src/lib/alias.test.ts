// Copied from Codebase (src/lib/alias.test.ts) by `npm run sync:shared`. Change it there, then sync. Never edit it here.

import { describe, expect, it } from "vitest";

import {
  ALIAS_MESSAGES,
  aliasCandidates,
  aliasFromName,
  aliasProblem,
  isCompleteAlias,
  isValidAlias,
  normalizeAlias,
} from "./alias";

describe("tidying what was typed", () => {
  it.each([
    ["@ayora", "ayora"],
    ["@@Ayora", "ayora"],
    ["  AYO.Okafor ", "ayo.okafor"],
    ["mary jane", "maryjane"],
    ["Ọláwálé", "olawale"],
    ["Ṣadé_1", "sade_1"],
    ["Ɗanƙwambo", "dankwambo"],
    ["ayo!", "ayo!"],
    ["", ""],
  ])("%s becomes %s", (typed, tidy) => {
    expect(normalizeAlias(typed)).toBe(tidy);
  });
});

/** The same cases as supabase/tests/database/02_aliases.sql and 09_signup_finish.sql. */
describe("the rules, the same as the database's", () => {
  it.each([
    "ayo",
    "ayora",
    "ayo.okafor",
    "ayo_okafor",
    "a.b_c.d",
    "ayo29",
    "2pac",
    "a1b",
    "bankole.ade",
    "xavier.o",
    "teamwork",
    "a".repeat(20),
  ])("allows %s", (alias) => {
    expect(isValidAlias(alias)).toBe(true);
    expect(aliasProblem(alias)).toBeNull();
  });

  it.each([
    ["ay", "too short"],
    ["a".repeat(21), "too long"],
    ["Ayora", "capitals"],
    ["ayo ra", "a space"],
    ["ayo-ra", "a hyphen"],
    ["ayo@ra", "an at sign"],
    [".ayora", "starts with a dot"],
    ["ayora_", "ends with an underscore"],
    ["ayo..ra", "two dots"],
    ["ayo._ra", "a dot and an underscore together"],
    ["08012345678", "only digits: a phone number"],
    ["0123456789", "only digits: an account number"],
    ["1.2_3", "no letter"],
    ["cyberx", "cyberx"],
    ["cyber.x", "cyber.x"],
    ["cyber_x.help", "cyber_x"],
    ["the.cyberx.team", "cyberx inside"],
    ["support", "a reserved word"],
    ["cbn.official", "reserved words as parts"],
    ["ada.bank", "a reserved word as one part"],
    ["x", "x alone"],
    ["mr.x", "x as a part"],
    ["", "nothing"],
  ])("refuses %s (%s)", (alias) => {
    expect(isValidAlias(alias)).toBe(false);
  });
});

describe("saying what's wrong", () => {
  it("is certain at once about characters that are never allowed", () => {
    expect(aliasProblem("ayo-ra")).toEqual({ message: ALIAS_MESSAGES.characters, certain: true });
    expect(aliasProblem("a!")).toEqual({ message: ALIAS_MESSAGES.characters, certain: true });
  });

  it("is certain about too long, a bad start and doubled dots", () => {
    expect(aliasProblem("a".repeat(21))).toEqual({
      message: ALIAS_MESSAGES.tooLong,
      certain: true,
    });
    expect(aliasProblem(".ayo")).toEqual({ message: ALIAS_MESSAGES.start, certain: true });
    expect(aliasProblem("_")).toEqual({ message: ALIAS_MESSAGES.start, certain: true });
    expect(aliasProblem("ayo..")).toEqual({ message: ALIAS_MESSAGES.doubled, certain: true });
    expect(aliasProblem("a_.b")).toEqual({ message: ALIAS_MESSAGES.doubled, certain: true });
  });

  it("waits for a pause before saying what more typing could fix", () => {
    expect(aliasProblem("ayo.")).toEqual({ message: ALIAS_MESSAGES.end, certain: false });
    expect(aliasProblem("123")).toEqual({ message: ALIAS_MESSAGES.noLetter, certain: false });
    expect(aliasProblem("bank")).toEqual({ message: ALIAS_MESSAGES.reserved, certain: false });
    expect(aliasProblem("cyberx.ng")).toEqual({ message: ALIAS_MESSAGES.reserved, certain: false });
  });

  it("says nothing about an alias that just isn't finished", () => {
    expect(aliasProblem("")).toBeNull();
    expect(aliasProblem("a")).toBeNull();
    expect(aliasProblem("ay")).toBeNull();
    expect(aliasProblem("a.")).toBeNull();
    expect(aliasProblem("12")).toBeNull();
  });

  it("knows when an alias is long enough to check", () => {
    expect(isCompleteAlias("ay")).toBe(false);
    expect(isCompleteAlias("ayo")).toBe(true);
    expect(isCompleteAlias("a".repeat(20))).toBe(true);
    expect(isCompleteAlias("a".repeat(21))).toBe(false);
  });
});

describe("an alias to start from", () => {
  it.each([
    ["Ayora", "ayora"],
    ["Mary Jane", "mary.jane"],
    ["Anne-Marie", "anne.marie"],
    ["Ọláwálé", "olawale"],
    ["D’Arcy", "darcy"],
    ["  Chidinma  ", "chidinma"],
    ["Oluwadamilolaoluwatobiloba", "oluwadamilolaoluwato"],
    ["Mary  -  Jane", "mary.jane"],
  ])("%s gives %s", (name, alias) => {
    expect(aliasFromName(name)).toBe(alias);
    expect(isValidAlias(alias)).toBe(true);
  });

  it.each(["Jo", "X", "Bank", "", "Support"])("%s gives none", (name) => {
    expect(aliasFromName(name)).toBe("");
  });

  it("never leaves a dot at the cut", () => {
    expect(aliasFromName("Oluwadamilolaoluwat Obi")).toBe("oluwadamilolaoluwat");
  });
});

describe("suggestions when the alias is taken", () => {
  const counter = () => {
    let next = 28;
    return () => (next += 1);
  };

  it("offers the first name, then both together, then numbers", () => {
    expect(aliasCandidates("kemi", "Folake", counter())).toEqual([
      "folake",
      "kemi.folake",
      "folake.kemi",
      "kemi39",
      "folake40",
      "kemi41",
      "folake42",
      "kemi43",
      "folake44",
      "kemi_45",
      "folake_46",
    ]);
  });

  it("doesn't join a name to itself or to a longer version of itself", () => {
    expect(aliasCandidates("ayo", "Ayora", counter())).toEqual([
      "ayora",
      "ayo39",
      "ayora40",
      "ayo41",
      "ayora42",
      "ayo43",
      "ayora44",
      "ayo_45",
      "ayora_46",
    ]);
    expect(aliasCandidates("ayora", "Ayora", counter())).toEqual([
      "ayora39",
      "ayora40",
      "ayora41",
      "ayora_42",
    ]);
  });

  it("works from the alias alone when the name can't make one", () => {
    expect(aliasCandidates("jo.jo", "Jo", counter())).toEqual([
      "jo.jo39",
      "jo.jo40",
      "jo.jo41",
      "jo.jo_42",
    ]);
  });

  it("keeps every suggestion within the rules, however long the alias", () => {
    const long = "a".repeat(19) + "b";
    const candidates = aliasCandidates(long, "Oluwadamilolaoluwatobiloba", counter());
    expect(candidates.length).toBeGreaterThan(3);
    for (const candidate of candidates) {
      expect(isValidAlias(candidate), candidate).toBe(true);
      expect(candidate).not.toBe(long);
    }
    expect(aliasCandidates("ayo.okafor.the.first", "Ayo", counter())).toContain(
      "ayo.okafor.the.fir39",
    );
  });

  it("never leaves a dot dangling where the alias was cut", () => {
    const candidates = aliasCandidates("abcdefghijklmnopq.rs", "Jo", counter());
    expect(candidates).toContain("abcdefghijklmnopq39");
    for (const candidate of candidates) expect(candidate).not.toMatch(/[._]{2}|\.\d+$/);
  });

  it("never offers a reserved word or the taken alias itself", () => {
    const candidates = aliasCandidates("kemi", "Bank", counter());
    expect(candidates).not.toContain("bank");
    expect(candidates).not.toContain("kemi");
    for (const candidate of candidates) expect(isValidAlias(candidate)).toBe(true);
  });

  it("always uses two digits, 10 to 99, whatever the number source gives", () => {
    for (const source of [0, 5, 89, 90, 12345, -7, 3.9]) {
      const [first] = aliasCandidates("kemi", "", () => source);
      expect(first).toMatch(/^kemi[1-9]\d$/);
    }
  });
});
