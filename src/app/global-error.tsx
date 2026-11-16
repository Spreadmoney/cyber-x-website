"use client";

import "@fontsource-variable/plus-jakarta-sans/wght.css";
import "./globals.css";

/**
 * Shown only if the page frame itself fails. It replaces the whole page, so
 * it carries its own <html> and <body> and keeps to plain words.
 */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en-GB">
      <body className="flex min-h-screen items-center justify-center p-6">
        <title>Something went wrong · Cyber X</title>
        <main className="flex max-w-[480px] flex-col gap-4">
          <h1 className="text-[28px] leading-[1.25] font-medium">
            Something went wrong on our side.
          </h1>
          <p className="text-muted-fg text-[17px] leading-[1.5]">
            It’s not you. Try again in a moment. Your money is safe: this website can’t move it.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="bg-accent h-[52px] rounded-full px-7 text-[17px] font-medium text-white"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
