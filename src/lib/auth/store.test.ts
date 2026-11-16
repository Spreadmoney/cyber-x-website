import { beforeEach, describe, expect, it, vi } from "vitest";

const answers = vi.hoisted(() => ({ rows: [] as unknown[][], queries: [] as string[] }));
vi.mock("@/lib/db", () => ({
  asWebsite: async (work: (sql: unknown) => Promise<unknown>) => {
    const sql = (strings: TemplateStringsArray) => {
      answers.queries.push(strings.join("?"));
      return Promise.resolve(answers.rows.shift() ?? []);
    };
    return work(sql);
  },
}));

import * as store from "./store";

const buf = Buffer.alloc(32);
const at = new Date("2026-11-16T18:00:00Z");

beforeEach(() => {
  answers.rows = [];
  answers.queries = [];
});

describe("the web functions, as the pages see them", () => {
  it("starts a sign-in", async () => {
    answers.rows.push([{ paused_until: null, password_hash: "$argon2id$x", locked_until: at }]);
    expect(
      await store.startSignin(buf, buf, { kind: "alias", value: "ayora" }, "password"),
    ).toEqual({
      pausedUntil: null,
      passwordHash: "$argon2id$x",
      lockedUntil: at,
    });
    answers.rows.push([]);
    expect(await store.startSignin(buf, buf, { kind: "id", value: "CX" }, "code")).toEqual({
      pausedUntil: null,
      passwordHash: null,
      lockedUntil: null,
    });
    expect(answers.queries[0]).toContain("web.signin_start");
  });

  it("reads each answer, and says gone when there is none", async () => {
    answers.rows.push([{ outcome: "wrong", tries_left: 4, until: null }], []);
    expect(await store.passwordResult(buf, false)).toEqual({
      outcome: "wrong",
      triesLeft: 4,
      until: null,
    });
    expect((await store.passwordResult(buf, false)).outcome).toBe("gone");

    answers.rows.push(
      [
        {
          status: "sent",
          deliver: true,
          phone: "+2348012345678",
          shown_phone: true,
          expires_at: at,
          resend_at: at,
          retry_at: null,
        },
      ],
      [],
    );
    expect(await store.sendCode(buf, buf)).toMatchObject({
      status: "sent",
      deliver: true,
      shownPhone: true,
    });
    expect(await store.sendCode(buf, buf)).toMatchObject({
      status: "gone",
      deliver: false,
      phone: null,
    });

    answers.rows.push([{ outcome: "signed_in", tries_left: null, until: null }], []);
    expect((await store.verifyCode(buf, buf, buf, "Chrome")).outcome).toBe("signed_in");
    expect(await store.verifyCode(buf, buf, buf, "Chrome")).toEqual({
      outcome: "gone",
      triesLeft: null,
      until: null,
    });
  });

  it("handles a passkey", async () => {
    answers.rows.push([{ paused_until: at }], [{ paused_until: null }]);
    expect(await store.passkeyStart(buf, buf, "challenge")).toEqual(at);
    expect(await store.passkeyStart(buf, buf, "challenge")).toBeNull();

    answers.rows.push([{ public_key: Buffer.from([1, 2]), sign_count: "7", challenge: "c" }], []);
    expect(await store.passkeyKey(buf, "cred")).toEqual({
      publicKey: new Uint8Array([1, 2]),
      signCount: 7,
      challenge: "c",
    });
    expect(await store.passkeyKey(buf, "cred")).toBeNull();

    answers.rows.push([{ outcome: "refused", until: null }], []);
    const args = {
      token: buf,
      credentialId: "c",
      verified: false,
      newCount: null,
      session: buf,
      browser: "x",
    };
    expect((await store.passkeyResult(args)).outcome).toBe("refused");
    expect((await store.passkeyResult(args)).outcome).toBe("gone");
  });

  it("reads a session and the account", async () => {
    answers.rows.push(
      [
        {
          display_name: "Ayora Okafor",
          cyberx_id: "CX-1",
          alias: "ayora",
          tier: 2,
          phone: "+2348012345678",
          method: "password",
          browser: "Chrome on Mac",
        },
      ],
      [],
    );
    expect(await store.sessionGet(buf)).toEqual({
      displayName: "Ayora Okafor",
      cyberxId: "CX-1",
      alias: "ayora",
      tier: 2,
      phone: "+2348012345678",
      method: "password",
      browser: "Chrome on Mac",
    });
    expect(await store.sessionGet(buf)).toBeNull();
    answers.rows.push([
      {
        display_name: null,
        cyberx_id: "CX-2",
        alias: null,
        tier: 0,
        phone: "+1",
        method: "code",
        browser: "x",
      },
    ]);
    expect(await store.sessionGet(buf)).toMatchObject({ displayName: null, alias: null });

    answers.rows.push([]);
    await store.sessionEnd(buf);
    expect(answers.queries.at(-1)).toContain("web.session_end");

    answers.rows.push([
      {
        place_id: "p1",
        kind: "phone",
        label: "iPhone",
        platform: "ios",
        signed_in: true,
        this_browser: false,
        last_seen_at: at,
      },
      {
        place_id: "w1",
        kind: "browser",
        label: "Chrome",
        platform: "web",
        signed_in: true,
        this_browser: true,
        last_seen_at: null,
      },
    ]);
    expect(await store.accountPlaces(buf)).toEqual([
      {
        id: "p1",
        kind: "phone",
        label: "iPhone",
        platform: "ios",
        signedIn: true,
        thisBrowser: false,
        lastSeenAt: at,
      },
      {
        id: "w1",
        kind: "browser",
        label: "Chrome",
        platform: "web",
        signedIn: true,
        thisBrowser: true,
        lastSeenAt: null,
      },
    ]);
    answers.rows.push([{ signed_in_at: at, place: "app", label: "iPhone" }]);
    expect(await store.accountSignins(buf, 5)).toEqual([{ at, place: "app", label: "iPhone" }]);
    answers.rows.push([{ ended: 1 }], []);
    expect(await store.signOutPhone(buf, "id")).toBe(1);
    expect(await store.signOutPhone(buf, "id")).toBe(0);
    answers.rows.push([{ frozen_at: at }], [{ frozen_at: null }]);
    expect(await store.freezeAccount(buf)).toEqual(at);
    expect(await store.freezeAccount(buf)).toBeNull();
  });
});
