import type { NextConfig } from "next";

import { checkEnvironment } from "./src/lib/env/startup";

/**
 * Before the website builds or starts, its settings are checked: both
 * addresses must be real web addresses, and any key that looks live is
 * refused. A wrong setting stops the build instead of reaching a visitor.
 */
checkEnvironment(process.env);

/**
 * Sent with every response. The website must never be shown inside another
 * site's frame, and it needs no camera, microphone or location. The
 * Content-Security-Policy is sent by src/proxy.ts, because it carries a new
 * one-time key on every page view.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
