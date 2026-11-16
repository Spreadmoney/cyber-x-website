import { afterEach, describe, expect, it, vi } from "vitest";

const pg = vi.hoisted(() => ({
  begin: vi.fn(),
  made: 0,
  queries: [] as string[],
  options: undefined as Record<string, unknown> | undefined,
}));
vi.mock("postgres", () => ({
  default: (_url: string, options: Record<string, unknown>) => {
    pg.made += 1;
    pg.options = options;
    return { begin: pg.begin };
  },
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  pg.begin.mockReset();
  pg.made = 0;
  pg.queries = [];
  pg.options = undefined;
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

  it("encrypts the line to Supabase, which its addresses don't ask for", async () => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgres://cyberx_website.ref:pw@aws-1-eu-west-2.pooler.supabase.com:6543/postgres",
    );
    vi.stubEnv("DATABASE_CA_CERT", "");
    const { db } = await import("./db");
    db();
    expect(pg.options?.ssl).toBe("require");
  });

  it("checks Supabase's certificate when it is given", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://u:pw@db.example.supabase.com:6543/postgres");
    vi.stubEnv("DATABASE_CA_CERT", "-----BEGIN CERTIFICATE-----\\nabc\\n-----END CERTIFICATE-----");
    const { db } = await import("./db");
    db();
    expect(pg.options?.ssl).toEqual({
      ca: "-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----",
      rejectUnauthorized: true,
    });
  });

  it("leaves a local test database, and an address that says its own sslmode, as they are", async () => {
    const { sslFor } = await import("./db");
    expect(sslFor("postgres://postgres:postgres@127.0.0.1:5432/x", undefined)).toBe(false);
    expect(sslFor("postgres://postgres@localhost/x", "cert")).toBe(false);
    expect(sslFor("postgres://u:p@host.example/x?sslmode=verify-full", undefined)).toBeUndefined();
    vi.stubEnv("DATABASE_URL", "postgres://u:p@host.example/x?sslmode=require");
    const { db } = await import("./db");
    db();
    expect(pg.options && "ssl" in pg.options).toBe(false);
  });

  it("treats a certificate the database can't prove as 'We can't reach Cyber X'", async () => {
    const { isConnectionError } = await import("./db");
    expect(
      isConnectionError(Object.assign(new Error("tls"), { code: "SELF_SIGNED_CERT_IN_CHAIN" })),
    ).toBe(true);
  });
});
