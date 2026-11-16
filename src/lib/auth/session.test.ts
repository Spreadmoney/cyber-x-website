import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
    set: (name: string, value: string) => jar.set(name, value),
    delete: (name: string) => jar.delete(name),
  }),
}));
const sessionGet = vi.hoisted(() => vi.fn());
vi.mock("./store", () => ({ sessionGet }));

import { CantReachError } from "@/lib/db";

import { COOKIES } from "./rules";
import { cookieOptions, getMe, secureCookies, setSessionCookie } from "./session";

beforeEach(() => {
  jar.clear();
  sessionGet.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("who is signed in to the website", () => {
  it("is nobody without a well-formed cookie", async () => {
    expect(await getMe()).toBeNull();
    jar.set(COOKIES.session, "short");
    expect(await getMe()).toBeNull();
    expect(sessionGet).not.toHaveBeenCalled();
  });

  it("names the person, with the number masked", async () => {
    jar.set(COOKIES.session, "s".repeat(43));
    sessionGet.mockResolvedValueOnce({
      displayName: "Ayora Okafor",
      cyberxId: "CX-1",
      alias: "ayora",
      tier: 2,
      phone: "+2348012345678",
      method: "password",
      browser: "Chrome on Mac",
    });
    expect(await getMe()).toMatchObject({
      name: "Ayora Okafor",
      firstName: "Ayora",
      initials: "AO",
      maskedPhone: "+234 801 •••• 678",
    });
    sessionGet.mockResolvedValueOnce({
      displayName: null,
      cyberxId: "CX-1",
      alias: null,
      tier: 0,
      phone: "+1",
      method: "code",
      browser: "x",
    });
    expect(await getMe()).toMatchObject({ name: "You", maskedPhone: null });
  });

  it("is nobody when the session is over, or there's no database", async () => {
    jar.set(COOKIES.session, "s".repeat(43));
    sessionGet.mockResolvedValueOnce(null);
    expect(await getMe()).toBeNull();
    sessionGet.mockRejectedValueOnce(new CantReachError());
    expect(await getMe()).toBeNull();
    sessionGet.mockRejectedValueOnce(new Error("boom"));
    await expect(getMe()).rejects.toThrow("boom");
  });

  it("keeps cookies to https on a real address", async () => {
    vi.stubEnv("WEBSITE_URL", "https://cyber-x-website-chi.vercel.app");
    expect(secureCookies()).toBe(true);
    expect(cookieOptions(60)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60,
    });
    vi.stubEnv("WEBSITE_URL", "http://localhost:3001");
    expect(secureCookies()).toBe(false);
    jar.set(COOKIES.signin, "x");
    await setSessionCookie("s".repeat(43));
    expect(jar.get(COOKIES.session)).toBe("s".repeat(43));
    expect(jar.has(COOKIES.signin)).toBe(false);
  });
});
