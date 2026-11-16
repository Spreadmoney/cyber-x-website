/**
 * The Content-Security-Policy sent with every page of the website (OWASP
 * ASVS 14.4.3 and 50.2, rule 10). The same strict policy as the app, with one
 * difference: the website's pages talk only to the website itself. The
 * database is reached by the website's server, never by the browser.
 *
 * - Scripts: only those carrying this page view's one-time key (the nonce),
 *   and the files they load. Code slipped into a page, inline event handlers
 *   such as onerror="…", javascript: links and scripts from other sites are
 *   all refused. eval is refused too, except in the development preview,
 *   where React needs it to show errors.
 * - Connections: only the website itself, so even injected code couldn't
 *   send data anywhere else.
 * - Framing: no site may show the website inside a frame (clickjacking),
 *   and the website shows no frames.
 * - Forms: may only be sent to the website itself.
 * - Styles may be inline: they can't run code, and React writes sizes into
 *   style attributes.
 *
 * Each page view gets a new nonce (src/proxy.ts), so every page is rendered
 * for its visit. A service added later (the card payment page in W6) adds
 * its address here, with a test.
 */
export interface CspOptions {
  /** This page view's one-time key. */
  nonce: string;
  /** The development preview (npm run dev). */
  development?: boolean;
}

export function buildCsp({ nonce, development = false }: CspOptions): string {
  if (!/^[A-Za-z0-9+/=_-]{16,}$/.test(nonce)) {
    throw new Error("The nonce must be at least 16 random base64 characters.");
  }

  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    [
      "script-src",
      [
        "'self'",
        `'nonce-${nonce}'`,
        // Scripts loaded by trusted scripts are trusted; nothing else is.
        "'strict-dynamic'",
        ...(development ? ["'unsafe-eval'"] : []),
      ],
    ],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:"]],
    ["font-src", ["'self'"]],
    ["connect-src", ["'self'"]],
    ["media-src", ["'self'"]],
    ["frame-src", ["'none'"]],
    ["frame-ancestors", ["'none'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'none'"]],
    ["form-action", ["'self'"]],
  ];

  return directives.map(([name, sources]) => `${name} ${sources.join(" ")}`).join("; ");
}

/** A fresh, unguessable nonce: 128 random bits, base64. */
export function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
