/**
 * The parts the website shares with the app. Codebase (the app) owns them:
 * they are changed there, then copied here by `npm run sync:shared`.
 *
 * Each entry is a path inside Codebase. The copy lands at the same path here,
 * so imports between shared files keep working, unless `to` says otherwise.
 * `extract: "theme"` copies only the @theme block (the design tokens) of a
 * stylesheet.
 *
 * Add an entry when a stage needs another shared part, then run the sync.
 */
export const SHARED = [
  // Design tokens: colours, type, shapes and motion.
  { from: "src/app/globals.css", to: "src/shared/app-theme.css", extract: "theme" },
  // The logo and the browser icons.
  { from: "src/components/brand/Wordmark.tsx" },
  { from: "src/components/brand/Wordmark.test.tsx" },
  { from: "src/app/icon.svg" },
  { from: "src/app/apple-icon.png" },
  // Country pack: naira, tiers and limits, the new-phone cap, phone format.
  { from: "src/config/countries/index.ts" },
  { from: "src/config/countries/ng.ts" },
  { from: "src/config/countries/types.ts" },
  { from: "src/config/countries/countries.test.ts" },
  // Money, alias and phone rules.
  { from: "src/lib/money.ts" },
  { from: "src/lib/money.test.ts" },
  { from: "src/lib/alias.ts" },
  { from: "src/lib/alias.test.ts" },
  { from: "src/lib/phone.ts" },
  { from: "src/lib/phone.test.ts" },
];
