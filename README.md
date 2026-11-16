# Cyber X · website

The Cyber X website: the working pages people use in a browser (sign in,
freeze, check a payment, the payment links, reports), and the pages that tell
people about the company and what it offers.

It works with the app in `../Codebase`. The app owns the database and every
movement of money; the website only shows what the app has done, through its
own limited database login.

The roadmap and build stages (W0 to W9) are in [docs/ROADMAP.md](docs/ROADMAP.md).

## First time on this laptop

```bash
npm ci                      # installs the exact packages in package-lock.json
npx playwright install      # the browsers the phone tests use
cp .env.example .env.local  # then fill in the settings (test keys only)
```

## Every day

| Command             | What it does                                                        |
| ------------------- | ------------------------------------------------------------------- |
| `npm run dev`       | Runs the website at http://localhost:3001 (the app uses 3000)       |
| `npm run check`     | Formatting, lint, types, rule tests with coverage, production build |
| `npm run e2e`       | Tests at iPhone (390), Android (360) and desktop (1440) widths      |
| `npm run check:dev` | Opens every page in the development preview and fails on any error  |
| `npm run check:all` | Everything above. Must pass before a stage is signed off            |

## Shared parts

The colours, type, logo, country pack (naira, tiers, limits, phone format) and
the money, alias and phone rules belong to the app. They are changed in
Codebase, then copied here:

| Command                | What it does                                                       |
| ---------------------- | ------------------------------------------------------------------ |
| `npm run sync:shared`  | Copies the shared parts from `../Codebase` (or `CODEBASE_DIR`)     |
| `npm run check:shared` | Fails if a copy was edited here, or the app changed since the sync |

The list is in `scripts/shared/list.mjs`. Every copy starts with a note saying
where it came from. `check:shared` runs before every build, so a drifted copy
never reaches Vercel.

## Where things are

| Folder           | What's in it                                       |
| ---------------- | -------------------------------------------------- |
| `src/app`        | Pages and routes                                   |
| `src/components` | The website's parts                                |
| `src/lib`        | Addresses, keys and security (the policy, headers) |
| `e2e`            | Phone and desktop tests                            |
| `docs`           | Roadmap and decisions                              |
