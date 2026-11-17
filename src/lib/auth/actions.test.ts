import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = vi.hoisted(() => new Map<string, string>());
const set = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
    set: (name: string, value: string, options: unknown) => {
      set(name, value, options);
      jar.set(name, value);
    },
    delete: (name: string) => jar.delete(name),
  }),
  headers: async () =>
    new Headers({
      "x-forwarded-for": "1.2.3.4, 10.0.0.1",
      "user-agent": "Mozilla/5.0 (Macintosh) Chrome/131 Safari/537",
    }),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));
const revalidate = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath: revalidate }));
vi.mock("@node-rs/argon2", () => ({
  verify: async (hash: string, password: string) => {
    if (password === "explode") throw new Error("bad hash");
    return hash === "$real" && password === "right password";
  },
}));
const webauthn = vi.hoisted(() => ({ verify: vi.fn() }));
vi.mock("@simplewebauthn/server", () => ({
  generateAuthenticationOptions: async ({ rpID }: { rpID: string }) => ({
    challenge: "c".repeat(43),
    rpId: rpID,
  }),
  verifyAuthenticationResponse: webauthn.verify,
}));
vi.mock("./store", () => ({
  startSignin: vi.fn(),
  passwordResult: vi.fn(),
  sendCode: vi.fn(),
  verifyCode: vi.fn(),
  passkeyStart: vi.fn(),
  passkeyKey: vi.fn(),
  passkeyResult: vi.fn(),
  sessionGet: vi.fn(),
  sessionEnd: vi.fn(),
  signOutPhone: vi.fn(),
  freezeAccount: vi.fn(),
}));

import { CantReachError } from "@/lib/db";

import * as actions from "./actions";
import { COOKIES, MESSAGES } from "./rules";
import * as store from "./store";

const mocked = vi.mocked(store);
const SECRET = "s".repeat(43);
const soon = (ms: number) => new Date(Date.now() + ms);
const sent = {
  status: "sent" as const,
  deliver: true,
  phone: "+2348012345678",
  shownPhone: true,
  expiresAt: soon(60_000),
  resendAt: soon(30_000),
  retryAt: null,
};
const reject = (promise: Promise<unknown>) => expect(promise).rejects.toThrow(/REDIRECT/);

beforeEach(() => {
  // The made-up account's number is a test number, so its code shows.
  vi.stubEnv("SMS_TEST_NUMBERS", "+2348012345678");
  jar.clear();
  set.mockClear();
  revalidate.mockClear();
  for (const fn of Object.values(mocked)) fn.mockReset();
  webauthn.verify.mockReset();
});

describe("password, then a code", () => {
  it("asks for the details first", async () => {
    expect(await actions.signInWithPassword("no way!", "x")).toEqual({
      step: "details",
      error: MESSAGES.who,
    });
    expect(await actions.signInWithPassword("@ayora", "")).toEqual({
      step: "details",
      error: MESSAGES.password,
    });
  });

  it("pauses when the visitor or the account is paused", async () => {
    mocked.startSignin.mockResolvedValueOnce({
      pausedUntil: soon(60_000),
      passwordHash: null,
      lockedUntil: null,
    });
    expect((await actions.signInWithPassword("@ayora", "x")).step).toBe("paused");
    mocked.startSignin.mockResolvedValueOnce({
      pausedUntil: null,
      passwordHash: null,
      lockedUntil: soon(1000),
    });
    expect((await actions.signInWithPassword("@ayora", "x")).step).toBe("paused");
    expect(set).toHaveBeenCalledWith(
      COOKIES.signin,
      expect.any(String),
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it("compares against a decoy when nothing matched, and says only 'wrong'", async () => {
    mocked.startSignin.mockResolvedValue({
      pausedUntil: null,
      passwordHash: null,
      lockedUntil: null,
    });
    mocked.passwordResult.mockResolvedValue({ outcome: "wrong", triesLeft: null, until: null });
    expect(await actions.signInWithPassword("@nobody", "right password")).toEqual({
      step: "details",
      error: MESSAGES.wrong,
    });
    expect(mocked.passwordResult).toHaveBeenCalledWith(expect.any(Buffer), false);
    mocked.startSignin.mockResolvedValue({
      pausedUntil: null,
      passwordHash: "$real",
      lockedUntil: null,
    });
    await actions.signInWithPassword("@ayora", "explode");
    expect(mocked.passwordResult).toHaveBeenLastCalledWith(expect.any(Buffer), false);
  });

  it("sends the code after the right password, shown in test mode", async () => {
    mocked.startSignin.mockResolvedValue({
      pausedUntil: null,
      passwordHash: "$real",
      lockedUntil: null,
    });
    mocked.passwordResult.mockResolvedValue({
      outcome: "code_needed",
      triesLeft: null,
      until: null,
    });
    mocked.sendCode.mockResolvedValue(sent);
    const state = await actions.signInWithPassword("@ayora", "right password");
    expect(state).toMatchObject({
      step: "code",
      number: "+234 801 •••• 678",
      testCode: expect.stringMatching(/^\d{6}$/),
    });
    expect(mocked.passwordResult).toHaveBeenCalledWith(expect.any(Buffer), true);
  });

  it("shows no code for a number that isn't a test number, the same as for no account", async () => {
    vi.stubEnv("SMS_TEST_NUMBERS", "+2348099999999");
    mocked.startSignin.mockResolvedValue({
      pausedUntil: null,
      passwordHash: null,
      lockedUntil: null,
    });
    mocked.sendCode.mockResolvedValue({ ...sent, shownPhone: false });
    const real = await actions.signInWithCode("@ayora");
    mocked.sendCode.mockResolvedValue({ ...sent, deliver: false, phone: null, shownPhone: false });
    const nobody = await actions.signInWithCode("@nobody");
    for (const state of [real, nobody]) {
      expect(state).toMatchObject({
        step: "code",
        number: null,
        testCode: undefined,
        testMode: true,
      });
    }
  });

  it("says locked, frozen, unavailable or gone", async () => {
    mocked.startSignin.mockResolvedValue({
      pausedUntil: null,
      passwordHash: "$real",
      lockedUntil: null,
    });
    mocked.passwordResult.mockResolvedValueOnce({
      outcome: "locked",
      triesLeft: 0,
      until: soon(900_000),
    });
    expect((await actions.signInWithPassword("@ayora", "x")).step).toBe("paused");
    mocked.passwordResult.mockResolvedValueOnce({
      outcome: "frozen",
      triesLeft: null,
      until: null,
    });
    expect(await actions.signInWithPassword("@ayora", "right password")).toEqual({
      step: "stopped",
      message: MESSAGES.frozen,
    });
    mocked.passwordResult.mockResolvedValueOnce({
      outcome: "unavailable",
      triesLeft: null,
      until: null,
    });
    expect(await actions.signInWithPassword("@ayora", "right password")).toEqual({
      step: "stopped",
      message: MESSAGES.unavailable,
    });
    mocked.passwordResult.mockResolvedValueOnce({ outcome: "gone", triesLeft: null, until: null });
    expect(await actions.signInWithPassword("@ayora", "right password")).toEqual({
      step: "details",
      error: MESSAGES.gone,
    });
  });

  it("says when Cyber X can't be reached, and lets other errors through", async () => {
    mocked.startSignin.mockRejectedValueOnce(new CantReachError());
    expect(await actions.signInWithPassword("@ayora", "x")).toEqual({
      step: "details",
      error: MESSAGES.cantReach,
    });
    mocked.startSignin.mockRejectedValueOnce(new Error("boom"));
    await expect(actions.signInWithPassword("@ayora", "x")).rejects.toThrow("boom");
  });
});

describe("a code alone, and resending", () => {
  it("sends nothing to a number with no account, and the screen can't tell", async () => {
    expect(await actions.signInWithCode("")).toEqual({ step: "details", error: MESSAGES.who });
    mocked.startSignin.mockResolvedValue({
      pausedUntil: null,
      passwordHash: null,
      lockedUntil: null,
    });
    mocked.sendCode.mockResolvedValueOnce({
      ...sent,
      deliver: false,
      phone: null,
      shownPhone: false,
    });
    expect(await actions.signInWithCode("@nobody")).toMatchObject({
      step: "code",
      number: null,
      testCode: undefined,
    });
    mocked.startSignin.mockResolvedValueOnce({
      pausedUntil: soon(1000),
      passwordHash: null,
      lockedUntil: null,
    });
    expect((await actions.signInWithCode("@ayora")).step).toBe("paused");
    mocked.startSignin.mockResolvedValueOnce({
      pausedUntil: null,
      passwordHash: null,
      lockedUntil: soon(1000),
    });
    expect((await actions.signInWithCode("@ayora")).step).toBe("paused");
  });

  it("waits before a new code, and stops at the limit", async () => {
    expect(await actions.resendSignInCode()).toEqual({ step: "details", error: MESSAGES.gone });
    jar.set(COOKIES.signin, SECRET);
    mocked.sendCode.mockResolvedValueOnce({ ...sent, status: "too_soon" });
    expect(await actions.resendSignInCode()).toMatchObject({
      step: "code",
      resendInMs: expect.any(Number),
    });
    mocked.sendCode.mockResolvedValueOnce({ ...sent, status: "limit", retryAt: soon(3_600_000) });
    expect((await actions.resendSignInCode()).step).toBe("stopped");
    mocked.sendCode.mockResolvedValueOnce({ ...sent, status: "gone" });
    expect(await actions.resendSignInCode()).toEqual({ step: "details", error: MESSAGES.gone });
  });

  it("signs in with the right code and goes on; explains a wrong one", async () => {
    expect(await actions.confirmSignInCode("/freeze", "123456")).toEqual({
      step: "details",
      error: MESSAGES.gone,
    });
    jar.set(COOKIES.signin, SECRET);
    mocked.verifyCode.mockResolvedValueOnce({ outcome: "signed_in", triesLeft: null, until: null });
    await expect(actions.confirmSignInCode("/freeze", "123456")).rejects.toThrow(
      "REDIRECT /freeze",
    );
    expect(jar.get(COOKIES.session)).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(jar.has(COOKIES.signin)).toBe(false);

    jar.set(COOKIES.signin, SECRET);
    const outcomes = [
      [
        { outcome: "wrong", triesLeft: 2, until: null },
        { step: "code", error: MESSAGES.wrongCode(2) },
      ],
      [
        { outcome: "expired", triesLeft: 3, until: null },
        { step: "code", error: MESSAGES.expired },
      ],
      [
        { outcome: "stopped", triesLeft: 0, until: null },
        { step: "stopped", message: MESSAGES.stopped },
      ],
      [
        { outcome: "frozen", triesLeft: null, until: null },
        { step: "stopped", message: MESSAGES.frozen },
      ],
      [
        { outcome: "wrong", triesLeft: null, until: null },
        { step: "code", error: MESSAGES.wrongCode(0) },
      ],
    ] as const;
    for (const [answer, state] of outcomes) {
      mocked.verifyCode.mockResolvedValueOnce(answer);
      expect(await actions.confirmSignInCode("/account", "12a3456")).toEqual(state);
    }
    mocked.verifyCode.mockResolvedValueOnce({
      outcome: "paused",
      triesLeft: null,
      until: soon(1000),
    });
    expect((await actions.confirmSignInCode("/account", "123456")).step).toBe("paused");
    mocked.verifyCode.mockRejectedValueOnce(new CantReachError());
    expect(await actions.confirmSignInCode("/account", "123456")).toEqual({
      step: "details",
      error: MESSAGES.cantReach,
    });
  });
});

describe("the passkey made in the app (W2.2)", () => {
  const answer = {
    id: "cred",
    rawId: "cred",
    response: {},
    type: "public-key",
    clientExtensionResults: {},
  } as never;

  it("asks for any of the app's passkeys, for the app's address", async () => {
    mocked.passkeyStart.mockResolvedValueOnce(null);
    expect(await actions.passkeyOptions()).toEqual({
      options: { challenge: "c".repeat(43), rpId: "localhost" },
    });
    mocked.passkeyStart.mockResolvedValueOnce(soon(1000));
    expect(await actions.passkeyOptions()).toMatchObject({ pausedMs: expect.any(Number) });
    mocked.passkeyStart.mockRejectedValueOnce(new CantReachError());
    expect(await actions.passkeyOptions()).toEqual({ error: MESSAGES.cantReach });
    mocked.passkeyStart.mockRejectedValueOnce(new Error("boom"));
    await expect(actions.passkeyOptions()).rejects.toThrow("boom");
  });

  it("checks the answer here, then signs in", async () => {
    expect(await actions.passkeyFinish("/account", answer)).toEqual({ error: MESSAGES.gone });
    jar.set(COOKIES.signin, SECRET);
    // An ID longer than any passkey's never reaches the database.
    expect(
      await actions.passkeyFinish("/account", {
        ...(answer as object),
        id: "x".repeat(1401),
      } as never),
    ).toEqual({
      error: MESSAGES.gone,
    });
    expect(mocked.passkeyKey).not.toHaveBeenCalled();
    mocked.passkeyKey.mockResolvedValue({
      publicKey: new Uint8Array([1]),
      signCount: 1,
      challenge: "chal",
    });
    webauthn.verify.mockResolvedValueOnce({
      verified: true,
      authenticationInfo: { newCounter: 2 },
    });
    mocked.passkeyResult.mockResolvedValueOnce({ outcome: "signed_in", until: null });
    await reject(actions.passkeyFinish("/account", answer));
    expect(webauthn.verify).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedChallenge: "chal",
        expectedOrigin: "http://localhost:3001",
        expectedRPID: "localhost",
        requireUserVerification: true,
      }),
    );
    expect(mocked.passkeyResult).toHaveBeenCalledWith(
      expect.objectContaining({ verified: true, newCount: 2 }),
    );
  });

  it("refuses a bad answer, and says why it stopped", async () => {
    jar.set(COOKIES.signin, SECRET);
    mocked.passkeyKey.mockResolvedValueOnce(null);
    mocked.passkeyResult.mockResolvedValueOnce({ outcome: "refused", until: null });
    expect(await actions.passkeyFinish("/account", answer)).toEqual({
      error: MESSAGES.passkeyCancelled,
    });
    expect(mocked.passkeyResult).toHaveBeenLastCalledWith(
      expect.objectContaining({ verified: false, newCount: null }),
    );

    mocked.passkeyKey.mockResolvedValue({
      publicKey: new Uint8Array([1]),
      signCount: 1,
      challenge: "chal",
    });
    webauthn.verify.mockRejectedValueOnce(new Error("bad signature"));
    mocked.passkeyResult.mockResolvedValueOnce({ outcome: "paused", until: soon(1000) });
    expect(await actions.passkeyFinish("/account", answer)).toMatchObject({
      pausedMs: expect.any(Number),
    });
    for (const [outcome, error] of [
      ["frozen", MESSAGES.frozen],
      ["unavailable", MESSAGES.unavailable],
    ] as const) {
      webauthn.verify.mockResolvedValueOnce({
        verified: true,
        authenticationInfo: { newCounter: 3 },
      });
      mocked.passkeyResult.mockResolvedValueOnce({ outcome, until: null });
      expect(await actions.passkeyFinish("/account", answer)).toEqual({ error });
    }
    mocked.passkeyKey.mockRejectedValueOnce(new CantReachError());
    expect(await actions.passkeyFinish("/account", answer)).toEqual({ error: MESSAGES.cantReach });
    mocked.passkeyKey.mockRejectedValueOnce(new Error("boom"));
    await expect(actions.passkeyFinish("/account", answer)).rejects.toThrow("boom");
  });
});

describe("signed in", () => {
  const me = {
    displayName: "Ayora Okafor",
    cyberxId: "CX-1",
    alias: "ayora",
    tier: 2,
    phone: "+2348012345678",
    method: "password" as const,
    browser: "Chrome on Mac",
  };

  it("signs out of the website only", async () => {
    await expect(actions.signOut()).rejects.toThrow("REDIRECT /");
    expect(mocked.sessionEnd).not.toHaveBeenCalled();
    jar.set(COOKIES.session, SECRET);
    await expect(actions.signOut()).rejects.toThrow("REDIRECT /");
    expect(mocked.sessionEnd).toHaveBeenCalledOnce();
    expect(jar.has(COOKIES.session)).toBe(false);
    jar.set(COOKIES.session, SECRET);
    mocked.sessionEnd.mockRejectedValueOnce(new CantReachError());
    await expect(actions.signOut()).rejects.toThrow("REDIRECT /");
    jar.set(COOKIES.session, SECRET);
    mocked.sessionEnd.mockRejectedValueOnce(new Error("boom"));
    await expect(actions.signOut()).rejects.toThrow("boom");
  });

  it("signs the app out on one of this account's phones", async () => {
    const form = new FormData();
    form.set("phone", "11111111-2222-3333-4444-555555555555");
    await expect(actions.signOutPhone(form)).rejects.toThrow("REDIRECT /sign-in?next=/account");
    jar.set(COOKIES.session, SECRET);
    mocked.sessionGet.mockResolvedValue(me);
    await actions.signOutPhone(form);
    expect(mocked.signOutPhone).toHaveBeenCalledWith(
      expect.any(Buffer),
      "11111111-2222-3333-4444-555555555555",
    );
    expect(revalidate).toHaveBeenCalledWith("/account");
    form.set("phone", "'; drop table");
    await actions.signOutPhone(form);
    expect(mocked.signOutPhone).toHaveBeenCalledOnce();
  });

  it("freezes, ends the website session and notes when", async () => {
    await expect(actions.freezeMyAccount()).rejects.toThrow("REDIRECT /freeze");
    jar.set(COOKIES.session, SECRET);
    mocked.sessionGet.mockResolvedValue(me);
    mocked.freezeAccount.mockResolvedValueOnce(new Date("2026-11-16T18:41:00Z"));
    await expect(actions.freezeMyAccount()).rejects.toThrow("REDIRECT /freeze/frozen");
    expect(JSON.parse(jar.get(COOKIES.frozen)!)).toEqual({
      at: "2026-11-16T18:41:00.000Z",
      browser: "Chrome on Mac",
    });
    expect(jar.has(COOKIES.session)).toBe(false);
    jar.clear();
    jar.set(COOKIES.session, SECRET);
    mocked.freezeAccount.mockResolvedValueOnce(null);
    await expect(actions.freezeMyAccount()).rejects.toThrow("REDIRECT /freeze/frozen");
    expect(jar.has(COOKIES.frozen)).toBe(false);
  });
});
