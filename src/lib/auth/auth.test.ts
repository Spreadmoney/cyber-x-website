import { afterEach, describe, expect, it, vi } from "vitest";

import { CantReachError, db, isConnectionError } from "@/lib/db";

import { browserLabel, firstNameOf, initialsOf, maskedNumber, readWho } from "./identity";
import { MESSAGES, formatMoment, formatWhen, readFrozenNote, safeNext, tierLabel } from "./rules";
import {
  DECOY_HASH,
  codeHash,
  hashSecret,
  isSecret,
  newCode,
  newSecret,
  visitorHash,
} from "./secrets";

describe("who someone is (W2.1)", () => {
  it("reads a Cyber X ID however it is typed", () => {
    expect(readWho("cx-7k2m-9qf4-t3xd")).toEqual({ kind: "id", value: "CX-7K2M-9QF4-T3XD" });
    expect(readWho(" CX 7K2M 9QF4 T3XD ")).toEqual({ kind: "id", value: "CX-7K2M-9QF4-T3XD" });
  });

  it("reads a phone number the ways people type it", () => {
    for (const typed of ["0801 234 5678", "+234 801 234 5678", "2348012345678", "801-234-5678"]) {
      expect(readWho(typed)).toEqual({ kind: "phone", value: "+2348012345678" });
    }
    expect(readWho("0801 234")).toBeNull();
  });

  it("reads an alias, with or without the @", () => {
    expect(readWho("@Ayora")).toEqual({ kind: "alias", value: "ayora" });
    expect(readWho("kemi.fabrics")).toEqual({ kind: "alias", value: "kemi.fabrics" });
    expect(readWho("no way!")).toBeNull();
    expect(readWho("   ")).toBeNull();
    expect(readWho(undefined)).toBeNull();
  });

  it("refuses anything but a short piece of text, before any work is done", () => {
    expect(readWho({ toString: () => "ayora" })).toBeNull();
    expect(readWho(["ayora"])).toBeNull();
    expect(readWho(42)).toBeNull();
    expect(readWho("a".repeat(65))).toBeNull();
  });

  it("hides the middle of a number", () => {
    expect(maskedNumber("+2348012345678")).toBe("+234 801 •••• 678");
    expect(maskedNumber("+4479460000")).toBeNull();
    expect(maskedNumber(null)).toBeNull();
  });

  it("names people and browsers", () => {
    expect(initialsOf("Ayora Okafor")).toBe("AO");
    expect(initialsOf("Ayora Chidinma Okafor")).toBe("AO");
    expect(initialsOf("ayora")).toBe("A");
    expect(initialsOf("")).toBe("CX");
    expect(firstNameOf("Ayora Okafor")).toBe("Ayora");
    expect(firstNameOf(null)).toBe("You");
    const ua = (s: string) => browserLabel(s);
    expect(
      ua("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605 Chrome/131 Safari/537"),
    ).toBe("Chrome on Mac");
    expect(
      ua(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Version/18 Safari/604",
      ),
    ).toBe("Safari on iPhone");
    expect(ua("Mozilla/5.0 (Linux; Android 14) SamsungBrowser/25 Chrome/120 Safari/537")).toBe(
      "Samsung Internet on Android",
    );
    expect(ua("Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537 Edg/120")).toBe(
      "Edge on Windows",
    );
    expect(ua("Mozilla/5.0 (X11; Linux x86_64; rv:130) Gecko Firefox/130")).toBe(
      "Firefox on Linux",
    );
    expect(ua("Mozilla/5.0 (iPad; CPU OS 17_0) OPR/100")).toBe("Opera on iPad");
    expect(ua("SomeBot/1.0 (Windows)")).toBe("A browser on Windows");
    expect(ua("SomeBot/1.0")).toBe("A browser");
    expect(browserLabel(null)).toBe("A browser");
  });
});

describe("the small rules", () => {
  it("sends a finished sign-in only to our own pages", () => {
    expect(safeNext("/freeze")).toBe("/freeze");
    expect(safeNext("//evil.example")).toBe("/account");
    expect(safeNext(undefined)).toBe("/account");
  });

  it("counts the tries left only from 3", () => {
    expect(MESSAGES.wrongCode(4)).toBe("That code isn’t right. Check it and try again.");
    expect(MESSAGES.wrongCode(3)).toBe("That code isn’t right. 3 tries left.");
    expect(MESSAGES.wrongCode(1)).toBe("That code isn’t right. 1 try left.");
    expect(MESSAGES.limit("at 21:00")).toBe("No more codes for now. Try again at 21:00.");
  });

  it("says when, in Lagos time", () => {
    const now = new Date("2026-11-16T18:00:00Z");
    expect(formatWhen(new Date("2026-11-16T19:15:00Z"), now, "Africa/Lagos")).toBe("at 20:15");
    expect(formatWhen(new Date("2026-11-17T08:00:00Z"), now, "Africa/Lagos")).toBe(
      "on 17 Nov at 09:00",
    );
    expect(formatMoment(new Date("2026-11-15T08:41:00Z"), "Africa/Lagos")).toBe(
      "15 Nov 2026, 09:41",
    );
    expect(tierLabel(2)).toBe("Tier 2");
    expect(tierLabel(0)).toBe("Not verified yet");
  });

  it("trusts only a well-formed freeze note", () => {
    const note = { at: "2026-11-16T18:00:00.000Z", browser: "Chrome on Mac" };
    expect(readFrozenNote(JSON.stringify(note))).toEqual(note);
    expect(readFrozenNote(JSON.stringify({ at: "soon", browser: "x" }))).toBeNull();
    expect(readFrozenNote(JSON.stringify({ at: note.at, browser: "x".repeat(81) }))).toBeNull();
    expect(readFrozenNote("{not json")).toBeNull();
    expect(readFrozenNote(undefined)).toBeNull();
  });
});

describe("secrets and codes", () => {
  it("makes secrets and keeps only their hash", () => {
    const secret = newSecret();
    expect(isSecret(secret)).toBe(true);
    expect(isSecret("short")).toBe(false);
    expect(isSecret(undefined)).toBe(false);
    expect(hashSecret(secret)).toHaveLength(32);
    expect(newSecret()).not.toBe(secret);
  });

  it("makes 6-digit codes tied to one sign-in", () => {
    expect(newCode()).toMatch(/^\d{6}$/);
    expect(codeHash("a", "123456").equals(codeHash("a", "123456"))).toBe(true);
    expect(codeHash("a", "123456").equals(codeHash("b", "123456"))).toBe(false);
    expect(visitorHash("1.2.3.4")).toHaveLength(32);
    expect(DECOY_HASH).toMatch(/^\$argon2id\$/);
  });
});

describe("the database line", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("says when there is no database, rather than failing", () => {
    vi.stubEnv("DATABASE_URL", "");
    expect(() => db()).toThrow(CantReachError);
    vi.stubEnv("DATABASE_URL", "mysql://nope");
    expect(() => db()).toThrow(CantReachError);
  });

  it("tells a missing database from a refusal", () => {
    expect(isConnectionError(new CantReachError())).toBe(true);
    expect(isConnectionError(Object.assign(new Error("x"), { code: "ECONNREFUSED" }))).toBe(true);
    expect(isConnectionError(Object.assign(new Error("x"), { code: "28P01" }))).toBe(true);
    expect(isConnectionError(Object.assign(new Error("x"), { code: "42501" }))).toBe(false);
    expect(isConnectionError(new Error("x"))).toBe(false);
    expect(isConnectionError("x")).toBe(false);
  });
});
