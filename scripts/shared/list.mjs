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
  // The app's database, so the website's tests can build a real one (W2).
  // Add each new migration the website relies on, then sync.
  { from: "scripts/db/local-supabase-shim.sql", to: "db/local-supabase-shim.sql" },
  {
    from: "supabase/migrations/20261113120000_identity_foundation.sql",
    to: "db/migrations/20261113120000_identity_foundation.sql",
  },
  {
    from: "supabase/migrations/20261113160000_alias_reserved_words_anywhere.sql",
    to: "db/migrations/20261113160000_alias_reserved_words_anywhere.sql",
  },
  {
    from: "supabase/migrations/20261114180000_signups.sql",
    to: "db/migrations/20261114180000_signups.sql",
  },
  {
    from: "supabase/migrations/20261114210000_signup_phone.sql",
    to: "db/migrations/20261114210000_signup_phone.sql",
  },
  {
    from: "supabase/migrations/20261114230000_signup_account.sql",
    to: "db/migrations/20261114230000_signup_account.sql",
  },
  {
    from: "supabase/migrations/20261115080000_signup_finish.sql",
    to: "db/migrations/20261115080000_signup_finish.sql",
  },
  {
    from: "supabase/migrations/20261115120000_signup_decisions.sql",
    to: "db/migrations/20261115120000_signup_decisions.sql",
  },
  {
    from: "supabase/migrations/20261116090000_signin.sql",
    to: "db/migrations/20261116090000_signin.sql",
  },
  {
    from: "supabase/migrations/20261116150000_website_login.sql",
    to: "db/migrations/20261116150000_website_login.sql",
  },
  {
    from: "supabase/migrations/20261116160000_unlock.sql",
    to: "db/migrations/20261116160000_unlock.sql",
  },
  {
    from: "supabase/migrations/20261116180000_freeze.sql",
    to: "db/migrations/20261116180000_freeze.sql",
  },
  {
    from: "supabase/migrations/20261116200000_recovery.sql",
    to: "db/migrations/20261116200000_recovery.sql",
  },
  {
    from: "supabase/migrations/20261116220000_phone_move.sql",
    to: "db/migrations/20261116220000_phone_move.sql",
  },
  {
    from: "supabase/migrations/20261116230000_approvals.sql",
    to: "db/migrations/20261116230000_approvals.sql",
  },
  {
    from: "supabase/migrations/20261116233000_web_signin.sql",
    to: "db/migrations/20261116233000_web_signin.sql",
  },
];
