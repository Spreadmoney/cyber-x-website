import { afterEach, describe, expect, it, vi } from "vitest";

const pg = vi.hoisted(() => ({ begin: vi.fn(), made: 0, queries: [] as string[] }));
vi.mock("postgres", () => ({
  default: () => {
    pg.made += 1;
    return { begin: pg.begin };
  },
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  pg.begin.mockReset();
  pg.made = 0;
  pg.queries = [];
});

describe("the website's line to the database", () => {
  it("runs work as the website's own login, in one transaction", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://cyberx_website:pw@pooler.example:6543/postgres");
    const tx = (strings: TemplateStringsArray) => {
      pg.queries.push(strings.join("?"));
      return Promise.resolve([]);
    };
    pg.begin.mockImplementation(async (work: (sql: unknown) => unknown) => work(tx));
    const { asWebsite, db } = await import("./db");
    expect(await asWebsite(async () => "done")).toBe("done");
    expect(pg.queries[0]).toBe("set local role cyberx_website");
    db();
    expect(pg.made).toBe(1);
  });

  it("turns a missing database into 'We can't reach Cyber X'", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://x@localhost/y");
    const { asWebsite, CantReachError } = await import("./db");
    pg.begin.mockRejectedValueOnce(Object.assign(new Error("down"), { code: "ECONNREFUSED" }));
    await expect(asWebsite(async () => 1)).rejects.toBeInstanceOf(CantReachError);
    pg.begin.mockRejectedValueOnce(Object.assign(new Error("no"), { code: "42501" }));
    await expect(asWebsite(async () => 1)).rejects.toThrow("no");
  });
});
