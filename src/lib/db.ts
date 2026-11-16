import "server-only";

import postgres from "postgres";

/**
 * The website's line to the app's database (W0.4, W2). It connects with the
 * website's own login, cyberx_website, which can run the functions in the
 * "web" section and nothing else: no table can be read or changed, even by
 * mistake.
 *
 * DATABASE_URL: on Vercel, Supabase's transaction pooler address for the
 * cyberx_website login; on a laptop or a test machine, a local Postgres.
 * Like every key, it lives in .env.local and Vercel only.
 */
let client: postgres.Sql | undefined;

/** The database couldn't be reached (or isn't set up yet): "We can't reach Cyber X". */
export class CantReachError extends Error {
  constructor(cause?: unknown) {
    super("The database could not be reached.", { cause });
    this.name = "CantReachError";
  }
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * How the line to the database is protected (OWASP ASVS 9.2.2). Supabase's
 * addresses don't ask for encryption, and without it the library talks in
 * the clear, so anything off this machine is encrypted:
 *
 * - DATABASE_CA_CERT set (Supabase's certificate, from Database settings →
 *   SSL): encrypted, and the database must prove it is Supabase's.
 * - Otherwise: encrypted.
 * - A local test database (no encryption there) or an address with its own
 *   sslmode=…: left as it is.
 */
export function sslFor(
  url: string,
  caCert: string | undefined,
): false | "require" | { ca: string; rejectUnauthorized: true } | undefined {
  const parsed = new URL(url);
  if (parsed.searchParams.has("sslmode")) return undefined;
  if (LOCAL_HOSTS.has(parsed.hostname)) return false;
  const ca = caCert?.trim();
  if (ca) return { ca: ca.replace(/\\n/g, "\n"), rejectUnauthorized: true };
  return "require";
}

export function db(): postgres.Sql {
  if (!client) {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) throw new CantReachError(new Error("DATABASE_URL is not set."));
    if (!/^postgres(ql)?:\/\//.test(url)) {
      throw new CantReachError(new Error("DATABASE_URL must start with postgres://."));
    }
    const ssl = sslFor(url, process.env.DATABASE_CA_CERT);
    client = postgres(url, {
      // Supabase's pooler shares connections between requests, so statements
      // can't be prepared ahead.
      prepare: false,
      max: 3,
      connect_timeout: 5,
      idle_timeout: 20,
      ...(ssl === undefined ? {} : { ssl }),
    });
  }
  return client;
}

const CONNECTION_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "ECONNRESET",
  "CONNECT_TIMEOUT",
  "EHOSTUNREACH",
  // The login has no password yet, or the wrong one.
  "28P01",
  "28000",
  // The database couldn't prove it is Supabase's (DATABASE_CA_CERT).
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "CERT_HAS_EXPIRED",
  "ERR_TLS_CERT_ALTNAME_INVALID",
]);

/** Whether an error means "no database", as opposed to "the database said no". */
export function isConnectionError(error: unknown): boolean {
  if (error instanceof CantReachError) return true;
  if (!(error instanceof Error)) return false;
  const code = (error as { code?: string }).code;
  return code !== undefined && CONNECTION_CODES.has(code);
}

/**
 * Runs work in one transaction as the website's login. On Vercel the
 * connection already is that login; on a test machine it may be the owner,
 * and taking on the role proves the website's grants are enough.
 */
export async function asWebsite<T>(work: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  try {
    return (await db().begin(async (transaction) => {
      // The library's type for a transaction drops its call signature; it is
      // the same tagged-template function, bound to this transaction.
      const sql = transaction as unknown as postgres.Sql;
      await sql`set local role cyberx_website`;
      return work(sql);
    })) as T;
  } catch (error) {
    if (isConnectionError(error)) throw new CantReachError(error);
    throw error;
  }
}
