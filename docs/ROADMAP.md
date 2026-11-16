# Cyber X website · roadmap

The full roadmap, with the reasons and the steps of every stage, is the Claude
Doc "Cyber X website: build roadmap":
https://claude.ai/artifact/2vZ9HoymNGP2QyDJJH3NpX

## How it fits with the app

- Same stack as the app (Codebase): Next.js 16, React 19, TypeScript (strict),
  Tailwind 4, Zod, Vitest, Playwright with accessibility checks, the same
  strict security headers.
- One database, the app's. Every database change lives in Codebase. The
  website's own login can only run the website's functions, which return only
  what a page may show: first names and initials, never a balance.
- Money stays in the app. The website asks the app to open a held order;
  the card payment is confirmed to the app.
- Shared parts are copied from Codebase by a sync command, and the build
  fails if the copies drift.
- No domain for the demo: the website and the app each have their own
  vercel.app address (APP_URL and WEBSITE_URL, set in both projects).

## Addresses

| What        | Address                                | GitHub                      |
| ----------- | -------------------------------------- | --------------------------- |
| The website | https://cyber-x-website-chi.vercel.app | Spreadmoney/cyber-x-website |
| The app     | https://cyber-x-eosin.vercel.app       | Spreadmoney/cyber-x         |

## Stages

One stage at a time. A stage is finished only when it passes the quality gate
and Ayora signs it off. When a working stage waits for its app module, a free
stage (W3 or W8) is built in the gap.

| Stage | What                        | Waits for        |
| ----- | --------------------------- | ---------------- |
| W0    | Setup                       |                  |
| W1    | Shell, Home and Get the app |                  |
| W2    | Sign in and freeze          | app M2           |
| W3    | Information pages           |                  |
| W4    | Check a payment             | app M6 and M14   |
| W5    | Payment request link        | app M7           |
| W6    | Pay me safely link          | app M9 and M10   |
| W7    | Reports and forms           | app M16 and M19  |
| W8    | Blog and Help               |                  |
| W9    | Testing and sign-off        | everything above |

## Working rules

- All website code lives in this folder (codebase2). Codebase is only read,
  except for the website's database changes, which live there.
- Keys go in `.env.local` and Vercel only. Never in code, a chat or a
  screenshot. Test keys only.
- When a test fails, the stage stops until it's fixed. A test that passes
  only sometimes counts as failing.
