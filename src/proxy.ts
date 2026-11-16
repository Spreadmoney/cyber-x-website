import { NextResponse, type NextRequest } from "next/server";

import { buildCsp, newNonce } from "@/lib/security/csp";

/**
 * Runs before every page: makes this page view's one-time key (nonce) and
 * sends the Content-Security-Policy with it. Next.js reads the key from the
 * request and puts it on every script it writes into the page.
 */
export function proxy(request: NextRequest) {
  const nonce = newNonce();
  const policy = buildCsp({ nonce, development: process.env.NODE_ENV === "development" });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not the built files or icons, and not the background
      // prefetches of links.
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
