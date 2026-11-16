import type { Metadata, Viewport } from "next";
import { connection } from "next/server";

import "@fontsource-variable/plus-jakarta-sans/wght.css";
import "@fontsource/ibm-plex-mono/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Cyber X",
    template: "%s · Cyber X",
  },
  description: "A new financial system, built around people.",
  applicationName: "Cyber X",
  // Phone numbers are never a way to pay on Cyber X, so never auto-link them.
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the fixed menu bar use the phone's safe area (notch, Dynamic Island).
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Every page is rendered for its own visit, so the scripts Next.js writes
  // into it carry that visit's one-time key (Content-Security-Policy, src/proxy.ts).
  await connection();
  return (
    <html lang="en-GB" className="h-full">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
