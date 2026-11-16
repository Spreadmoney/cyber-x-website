/**
 * The reference shown on "Something went wrong", such as ERR-7F3A-1611:
 * four characters from the error's own fingerprint (Next.js's digest, which
 * also appears in the server log), then the day and month. Someone who
 * contacts us can read it out, and we can find the error.
 */
export function errorReference(digest: string | undefined, now: Date = new Date()): string {
  const source = (digest ?? "").replace(/[^0-9a-z]/gi, "").toUpperCase();
  const code = (source || randomCode()).toUpperCase().slice(0, 4).padEnd(4, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `ERR-${code}-${day}${month}`;
}

function randomCode(): string {
  const bytes = new Uint8Array(2);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
