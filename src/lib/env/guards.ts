/**
 * Rules for the keys Cyber X is allowed to read.
 *
 * Keys live in two places only: the .env.local file on the build laptop and
 * Vercel's Environment Variables. They are never written in code. Until
 * Cyber X is licensed to move real money, only test keys are accepted: a key
 * that looks live is refused before it can be used.
 */

export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvError";
  }
}

/** Marks that appear in live keys from the payment platforms we use. */
const LIVE_KEY_PATTERNS: readonly RegExp[] = [
  /(^|[_-])live([_-]|$)/i, // sk_live_…, pk_live_…, FLWSECK-live-…
  /(^|[_-])prod(uction)?([_-]|$)/i, // …_prod_…, …-production-…
];

export function looksLikeLiveKey(value: string): boolean {
  return LIVE_KEY_PATTERNS.some((pattern) => pattern.test(value));
}

type EnvSource = Readonly<Record<string, string | undefined>>;

/**
 * Returns the value of an environment variable, or throws a message that
 * names the missing key and says where it belongs. Never logs the value.
 */
export function requireEnv(name: string, source: EnvSource): string {
  const value = source[name]?.trim();
  if (!value) {
    throw new EnvError(
      `${name} is not set. Add it to .env.local on this laptop (and to Vercel's Environment Variables). Never put a key in the code.`,
    );
  }
  return value;
}

/**
 * Like requireEnv, for secret keys: also refuses anything that looks like a
 * live key. The error never includes the key itself.
 */
export function requireTestKey(name: string, source: EnvSource): string {
  const value = requireEnv(name, source);
  if (looksLikeLiveKey(value)) {
    throw new EnvError(
      `${name} looks like a live key. Cyber X only accepts test keys for now. Replace it with the test key.`,
    );
  }
  return value;
}

/** Like requireEnv, for addresses: the value must be a full http(s) URL. */
export function requireUrl(name: string, source: EnvSource): string {
  const value = requireEnv(name, source);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new EnvError(`${name} must be a full web address, starting with https://.`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new EnvError(`${name} must be a full web address, starting with https://.`);
  }
  return value;
}
