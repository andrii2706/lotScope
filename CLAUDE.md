@AGENTS.md

# LotScope — project context

This file gives full context for working on the project. Keep it in the repository root next
to `package.json`. The first line imports `AGENTS.md`, which holds the rules for this version
of Next.js.

The project owner writes in Ukrainian: reply to him in Ukrainian. All user-facing UI text is
Ukrainian. The code has no comments: the owner asked to keep it that way, so do not add any.

## What the product is

LotScope (working title) is a web app for companies that import cars from US auctions
(IAAI, Copart) to Ukraine. The business model is B2B: a tool for the company's sourcing
managers, not a public service for end buyers.

A manager uploads the lot photos and the details from the auction listing and gets:

- an AI damage assessment from the photos: damaged parts, repair scenarios, risks, missing views;
- a repair cost range at the company's own prices;
- a turnkey price: auction, logistics, import duty, excise, VAT, pension fund fee, services;
- the maximum bid at which the client still keeps a target saving against the Ukrainian market;
- a PDF report for the client with the company's logo and contacts.

Competitors that already do something similar for end buyers: Car Spy (carspy.io),
carpybara.AI, Inspect Auction, AutoEstimatePro. LotScope's difference is the company
workspace, the company's own rates, and a report under the company's brand.

## Current state

A working MVP. Verified:

- build, lint and type check pass;
- 35 tests pass (`npm test`): calculations, VIN checks, lot query parsing, provider mapping, lot search, VIN history, LiqPay signatures and callbacks, billing periods, password hashing;
- the full flow in a browser on desktop and phone: form → analysis → report → editing
  amounts → print to PDF → history → settings;
- real AI analysis with an API key works: the first real lot (2018 BMW 330i GT xDrive,
  right front corner hit, 12 photos) produced a meaningful result with `"demo": false`.

Not verified: accuracy of repair estimates against a sample of lots with known real repair cost.

## Stack

- Next.js 16.3.8 (App Router, Turbopack), React 19.2, TypeScript 5
- Tailwind CSS 4 (configured through `@theme` in `globals.css`, no `tailwind.config`)
- `@anthropic-ai/sdk` — Claude call with images and structured output
- `lucide-react` — icons
- `@fontsource-variable/manrope` (body font), `@fontsource-variable/unbounded` (display font)
- Tests: built-in `node:test`, no extra libraries
- Postgres through `pg` (plain SQL, schema in `db/schema.sql`, applied by `npm run db:migrate`): companies, users, sessions, invites, payments, usage, lessons, lot_unlocks, reports, report_photos, audit_log. Reports and company settings live in the database
- Requires Node.js 20.9+

## Commands

```bash
npm install
docker compose up -d   # local Postgres on 5432
npm run db:migrate
npm run dev      # http://localhost:3000
npm run build
npm start
npm run lint
npm test         # tests/*.test.mjs
npx tsc --noEmit
```

## Environment variables

They live in `.env.local` in the project root (that file, not `.env.example` — the app does
not read the template). Restart the server after changing it.

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | for analysis | Claude API key. Without it the app runs in demo mode. |
| `ANTHROPIC_MODEL` | no | Model, defaults to `claude-sonnet-5-5`. |
| `ANTHROPIC_EFFORT` | no | Model reasoning depth: `low`, `medium`, `high`, `xhigh` or `max`. Unset = model default. Check that the chosen model supports it. |
| `DATABASE_URL` | yes | Postgres connection string. Without it nobody can sign in. |
| `APP_URL` | for payments and Google | Public base URL; LiqPay `server_url` / `result_url` and the Google redirect URI are built from it. |
| `ADMIN_EMAILS` | yes for the first superadmin | Comma-separated emails that get the derived `superadmin` role and the console at `/admin`. |
| `SESSION_HOURS` | no | Session length in hours, default 8. |
| `SALES_CONTACT` | no | Shown on the register page for companies that want access. |
| `LIQPAY_PUBLIC_KEY`, `LIQPAY_PRIVATE_KEY` | for card payments | LiqPay merchant keys. Also used to cancel a subscription. |
| `LIQPAY_SANDBOX` | no | `1` adds `sandbox=1` to checkout and accepts the `sandbox` status as paid. |
| `LIQPAY_SIGNATURE` | no | `sha1` (default) or `sha3-256`: algorithm for outgoing signatures. Incoming ones are checked against both. |
| `LIQPAY_API_URL` | no | Defaults to `https://www.liqpay.ua/api/request`; used by tests to point at a mock. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | for Google sign-in | OAuth client (Web application). Redirect URI: `APP_URL/api/auth/google/callback`. |
| `GOOGLE_AUTH_URL`, `GOOGLE_TOKEN_URL`, `GOOGLE_USERINFO_URL` | no | Default to Google's endpoints; used by tests to point at a mock. |
| `INVOICE_DETAILS` | for invoices | Bank details shown on an invoice; `\n` separates lines. |
| `AUCTION_API_KEY` | no | Licensed auction data provider key (apiauctions.io). Enables lot autofill, photos and comparable sales. Without it "Знайти лот" only shows search links. |
| `AUCTION_API_URL` | no | Provider base URL, defaults to `https://apiauctions.io`. Used by tests to point at a mock. |
| `VINAUDIT_API_KEY`, `VINAUDIT_USER`, `VINAUDIT_PASS` | no | VinAudit (NMVTIS) for automatic VIN history: title records, brands, junk/salvage/insurance records. About $1 per query. |
| `VINAUDIT_API_URL` | no | VinAudit base URL, defaults to `https://api.vinaudit.com`. |

Never put a real key in `.env.example` and never commit `.env.local`.

`GET /api/analyze` returns `{ configured, model }` — a quick way to check
whether the key was picked up.

## Structure

```
src/app/
  layout.tsx                root layout, fonts, AppShell
  globals.css               theme: color variables, @theme, print styles
  page.tsx                  new analysis form: "Знайти лот" + 5 steps (photos, car, prices, lot card, VIN history)
  report/[id]/page.tsx      on-screen report (dark) + mounts PrintReport
  history/page.tsx          report history with search ("Звіти" in the nav)
  search/page.tsx           active lot search across Copart and IAAI
  expert/page.tsx           expert lessons: stats, toggle, add, export JSON, reports awaiting review
  settings/page.tsx         brand, rates, repair prices, exchange rates
  login, register, invite/[token]   auth pages
  billing/page.tsx          credits, plans, card payment, invoice, payment history
  team/page.tsx             members, seats and licenses, roles, invite links, company name
  admin/page.tsx            superadmin console: totals, companies, personal accounts, invoices, global log
  admin/company/[id]/page.tsx  superadmin company page: seats, suspend, users, payments, log
  activity/page.tsx         company admin: per-person counters, company reports, company log
  api/auth/*                register, login, logout, me, accept invite, providers
  api/auth/google/*         start and callback of Google OAuth
  api/team, api/lessons     team management, company lessons
  api/billing/*             billing info, checkout (LiqPay), invoice, webhook, return, cancel
  api/admin, api/admin/company/[id], api/admin/log  superadmin actions (companies, seats, invoices, suspend, users, log)
  api/reports, api/reports/[id], .../photo/[n], .../event  reports in the database, photos, PDF audit event
  api/settings              company settings (GET all, PUT with `settings` permission)
  api/activity              company admin activity
  api/analyze/route.ts      GET status, POST analysis (validation, Claude call, history report as document blocks)
  api/lot/route.ts          GET status, POST lot lookup through the auction data provider
  api/search/route.ts       POST active lot search (provider get-cars + filters + comparables)
  api/history/route.ts      POST automatic VIN history (provider auction history + VinAudit NMVTIS)
src/components/
  AppShell.tsx              header, navigation, brand color injection
  ui.tsx                    PageHeader, StepCard, Card, Field, NumberInput, Segmented, Button, Notice
  PhotoUploader.tsx         photo upload: drag and drop, file picker, paste from clipboard
  CostTable.tsx             CostBar (price composition bar) and CostTable (line items)
  PrintReport.tsx           light client report, visible only when printing
  ScoreRing.tsx             0–100 condition score ring
  LotFinder.tsx             "Знайти лот": link / lot number / VIN search, search links, comparables
  HistoryUploader.tsx       Carfax / AutoCheck PDF or screenshots, links to Carfax and AutoCheck
  HistoryMarket.tsx         report block "Історія та ринок"
  VinHistoryPanel.tsx       automatic VIN history in form step 5
  ExpertReviewCard.tsx      "Перевірка експерта СТО" under the report photo
src/lib/
  types.ts                  LotInput, Analysis, Settings, Report, CostOverrides, AnalyzeRequest/Response
  defaults.ts               DEFAULT_SETTINGS, EMPTY_LOT, MAX_PHOTOS
  calc.ts                   customs clearance, turnkey price, maximum bid
  prompt.ts                 SYSTEM_PROMPT, buildLotText, ANALYSIS_SCHEMA
  normalize.ts              coerces the model's response into the Analysis type
  demo.ts                   DEMO_ANALYSIS for demo mode
  store.ts                  client cache over /api/reports and /api/settings (+ in-memory unsaved reports, local prefs theme/expertName)
  roles.ts                  Role, Permission, permission matrix, route permissions, home page per role
  audit.ts, audit-labels.ts audit() writer and Ukrainian action labels
  members.ts                invite/activate/deactivate/remove/role helpers shared by team and superadmin APIs
  images.ts                 in-browser photo compression, logo handling
  labels.ts                 Ukrainian labels, tones, formatting
  color.ts                  accentInk, accentText for the brand color
  vin.ts                    VIN comparison and check-digit validation
  auction.ts                parseLotQuery, searchLinks, priceStats, mapProviderRecord, salePricesFrom
  theme.ts                  useResolvedTheme, THEME_BOOT_SCRIPT (no-flash theme before paint)
  server.ts                 shared route helpers: fail, readJson, text
  auth.ts                   sessions, currentUser, requireUser (server only)
  db.ts                     pg pool, query, tx
  password.ts               scrypt hashing
  plans.ts                  plans and billing periods
  billing.ts                credits, payment approval, invoices
  liqpay.ts, lpConfig.ts    LiqPay signatures, checkout data, callbacks, API request body
  google.ts                 Google OAuth config, PKCE helpers, code exchange
  seats.ts                  seat usage of a company
  unlocks.ts                paid lot unlocks and the free first analysis
  me.ts, api.ts, lessonsClient.ts  client stores and fetch helper
  provider.ts               auction data provider client (server only)
  search.ts                 active lot mapping, filters, auction search links
  vinhistory.ts             VIN history mapping, mileage rollback and repeat-auction checks, prompt text
  useVinHistory.ts          client hook: fetch /api/history when the VIN becomes valid
tests/calc.test.mjs         calculation tests
tests/vin.test.mjs          VIN tests
tests/auction.test.mjs      lot query parsing, price stats, provider mapping
tests/search.test.mjs       active lots, filters
tests/vinhistory.test.mjs   VIN history mapping and checks
tests/billing.test.mjs      LiqPay signatures and callbacks, periods, passwords
db/schema.sql               database schema; scripts/migrate.mjs applies it
src/proxy.ts                redirects pages without a session cookie to /login
```

## How an analysis runs

1. `page.tsx` collects a `LotInput` and the photos. `images.ts` compresses each photo in the
   browser into three copies: `data` (JPEG up to 1568 px, base64, sent for analysis),
   `thumb` (640 px), `cover` (1200 px).
2. POST `/api/analyze` with `{ lot, images, pricing }`. `pricing` comes from the company
   settings: labor rate, paint price per panel, parts preference.
3. `route.ts` checks the session, takes a credit, sanitizes and validates the data (`sanitizeLot`), and
   limits photo count and size.
4. With no key, it returns `DEMO_ANALYSIS` with `demo: true`.
5. With a key, it calls `client.messages.create` with `system: SYSTEM_PROMPT`, the lot text,
   photos labelled `Photo N:`, and `output_config.format` of type `json_schema`
   (`ANALYSIS_SCHEMA`). The response is guaranteed valid JSON.
6. `normalizeAnalysis` coerces the result to the type, trims long strings, fixes inverted ranges.
7. The client saves the `Report` through `POST /api/reports` when the user has the `save` permission (otherwise it stays in memory as `tmp-…`, `saved: false`) and navigates to `/report/[id]`.

The API key lives only on the server and never reaches the browser.

### Division of responsibility

The AI is responsible only for what is visible in the photos and for the repair cost range.
All arithmetic (customs clearance, fees, maximum bid) is deterministic code in `calc.ts` and is
covered by tests. Do not move calculations into the prompt. Anything that can be checked in
code (for example, comparing VINs) should be checked in code, not delegated to the model.

### Honesty of demo mode

A demo report is always explicitly labelled: a notice on the form, a notice in the report,
a "демо" tag in history, a line in the printed report. Do not remove these labels and do not
let the sample pass for a real analysis.

## Calculations (`src/lib/calc.ts`)

Ukrainian customs rules as of 2026:

- customs value = bid + auction fee + inland US delivery + ocean freight;
- import duty 10 % of customs value, 0 % for electric cars;
- excise = base rate in € × engine volume in liters × age coefficient:
  petrol 50 € (100 € above 3000 cc), diesel 75 € (150 € above 3500 cc),
  hybrid is treated as petrol, electric is 1 € per kWh of battery;
- age coefficient = calculation year − model year − 1, minimum 1, maximum 15;
- VAT 20 % of (customs value + duty + excise);
- pension fund fee at first registration: 3 / 4 / 5 % of the value excluding VAT, with thresholds
  at 165 and 290 subsistence minimums (3328 UAH from 01.01.2026); electric cars are exempt.
  In the code the fee base is the customs value.

`calculate(lot, settings, overrides, repair, now)` returns a `CostResult`: four groups of line
items ("Купівля в США", "Розмитнення", "Україна", "Після купівлі"), the turnkey range, the
saving against the market, and `maxBidUsd`.

The maximum bid is found by binary search: the highest bid at which the turnkey total with the
upper repair bound does not exceed `market × (1 − targetSavingsPct)`. It is rounded down to 25 $.

`CostOverrides` are amounts a manager corrected in a specific report. They are stored in the
report and take priority over the rates from settings.

The tests check duty, excise and VAT against published examples (Toyota RAV4 2020,
Tesla Model Y 2021). If you change the formulas, update the tests.

Known simplifications:

- the auction fee is a percentage plus a fixed part; real IAAI and Copart fee tables are tiered;
- plug-in hybrids are not supported;
- exchange rates are entered manually in settings;
- all starting rates in `defaults.ts` are examples, not real prices.

## Prompt and schema (`src/lib/prompt.ts`)

`SYSTEM_PROMPT` is written in English and explains the situation to the model: who uses the
report, why accuracy matters, which areas auction photos usually hide, that repair prices must
be Ukrainian, and that listing details are typed by a human and may contradict the photos.
The model returns every text field in Ukrainian.

`ANALYSIS_SCHEMA` is the JSON schema of the response. Structured output limitations:
`minimum`, `maximum` and `minLength` are not supported, so ranges are checked in `normalize.ts`.

If you change the schema, update `types.ts` (`Analysis`), `normalize.ts` and `demo.ts` together.

## Theme

A dark "automotive" interface by default, a light theme on demand, a light document on paper.

- `Settings.theme` is `dark | light | system`. The header button toggles dark/light; settings
  have all three. `useResolvedTheme` sets `data-theme` on `<html>`; `THEME_BOOT_SCRIPT` in the
  layout `<head>` sets it before paint so there is no flash.
- Light values live in `:root[data-theme="light"]` in `globals.css`. When you add a color
  variable, define it for dark, light and print.
- `accentText(hex, theme)` darkens light brand colors on the light theme so text stays readable.

- All colors are CSS variables on `:root` in `globals.css`, exposed to Tailwind through
  `@theme inline`. Classes: `bg-paper`, `bg-surface`, `bg-panel2`, `border-line`, `border-line2`,
  `text-ink`, `text-on-ink`, `text-muted`, `text-faint`, `bg-scrim`, `text-good|warn|bad`,
  `bg-good-bg|warn-bg|bad-bg`.
- The `@media print` block redefines these variables to light values. So do not use hard-coded
  `bg-white`, `text-white` or `bg-black` for interface elements — use the theme variables.
  The exception is captions over photos (`bg-scrim text-white`).
- Company brand color: `AppShell` sets `--accent`, `--accent-ink` (text on an accent background)
  and `--accent-text` (accent-colored text on the dark background) via `color.ts`. Classes:
  `bg-accent`, `text-accent-ink`, `text-accent-text`. For text and borders use `accent-text`,
  not `accent`: a company may pick a dark color.
- Accent should be rare: the primary button, the turnkey price, the most likely scenario.
- Chart colors `--series-1..4` are validated for color-vision-deficiency separation, separately
  for the dark and light backgrounds. Do not change them by eye.
- Status is never conveyed by color alone: there is always an icon or a label next to it.
- `.no-print` hides an element on paper, `.print-only` shows it only on paper.

The report exists in two views built from the same data: the on-screen one in
`report/[id]/page.tsx` and the printed one in `PrintReport.tsx`. When you add a block to the
report, add it to both.

## Storage (`src/lib/store.ts`)

Reports (`reports` + `report_photos`) and company settings (`companies.settings`, jsonb) are in
Postgres. `store.ts` keeps the same synchronous API as before (`useReports`, `useSettings`,
`saveSettings`, `getSettings`, `updateReport`, `deleteReport`, `useHydrated`) as a client cache:
it loads `/api/reports` and `/api/settings` when the signed-in user changes (`onUserChange` in
`me.ts`), updates optimistically and syncs in the background. `useHydrated()` is true once the
first load finished. Only `theme` and `expertName` stay in `localStorage` (`lotscope.prefs.v1`).
`saveReport(report, persist)` stores to the server when `persist`, otherwise keeps an in-memory
report with id `tmp-…` (users without the `save` permission). Report photos are served by
`/api/reports/[id]/photo/[n]` as private images, so `Report.photos` are URLs for saved reports
and data URLs for unsaved ones. A report is visible to its author, and to roles with `reportsAll`
(company admin, expert).

## Accounts, credits and payments

- Auth is hand-written: scrypt password hashes (`password.ts`), random session tokens stored as
  SHA-256 in `sessions`, httpOnly cookie `ls_session` (Secure when the request is https),
  30 days. `src/proxy.ts` only checks that the cookie exists and redirects pages to `/login`;
  every API route checks the session with `requireUser(roles?)`. Login has an in-memory rate
  limit (8 attempts / 15 min per email).
- Roles (`src/lib/roles.ts`): `superadmin` (derived from `ADMIN_EMAILS`, not stored), `admin`
  (company admin), `manager`, `expert`, `user` (public signup, personal company). The permission
  matrix is `MATRIX`; `can(actor, permission)` also requires `subscribed` for `save` and `pdf`.
  `requireUser("permission")` enforces it on the server (401 `code: session`, 403 `code: suspended`,
  `subscription` or `forbidden`). The client hides navigation and redirects by `routePermission`
  in `AppShell`. The company admin deliberately cannot search or analyze (change `MATRIX` to
  widen it). Invites are one-time links valid 7 days (`/invite/[token]`); the superadmin can invite
  `admin`, `manager`, `expert`; the company admin only `manager` and `expert`. Lessons are written
  by `expert` only.
- Public signup (`/api/auth/register`, Google without invite) creates a `personal` company with one
  seat and role `user`. Teams are created only by the superadmin (`companies.kind = 'team'`).
- Sessions last `SESSION_HOURS` (default 8): DB `expires_at`, cookie expiry, a client timer in
  `AppShell` and `api()` redirect to `/login?error=session`.
- Suspension: `companies.suspended` makes `requireUser` answer 403 `suspended`, deletes sessions, and
  `AppShell` shows a block screen; people can still log in to see it.
- Subscription: `CurrentUser.subscribed` means a plan in `personal/start/team` with `period_end` in
  the future. Seats are never changed by a plan or by the company admin; only the superadmin.
- Audit: `audit(actor, action, target, detail)` writes `audit_log` (logins, analyses, unlocks, report
  save/delete/pdf, invites, user changes, seats, invoices, suspension). The company admin sees the
  company slice on `/activity`, the superadmin everything on `/admin`. The PDF event is reported by
  the client (`/api/reports/[id]/event`), print blocking in the browser (`print-locked` class) is
  cosmetic only.
- Credits: `companies.credits`. `/api/analyze` takes one credit atomically before calling Claude
  and refunds it if the call fails or stops early; demo mode is free. Opening a lot (`/api/lot`,
  `/api/history`) costs one credit too, see the licenses section below. Every charge and refund is in `usage`.
- Plans in `src/lib/plans.ts`: trial 3 free on registration (2 seats), "Старт" 1990 UAH / 50 per month,
  "Команда" 5990 UAH / 200 per month, "Пакет +20" 990 UAH one-time. Prices are examples.
- Card payments, LiqPay: `/api/billing/checkout` creates a pending payment (`LS-<company>-<plan>-<ts>`)
  and returns `{ action, fields: { data, signature } }`; the browser posts the form to
  `https://www.liqpay.ua/api/3/checkout`. `data` is base64 JSON (version 7; `action` is `pay` or, for
  monthly plans, `subscribe` with `subscribe_periodicity: month` and `subscribe_date_start` = now UTC);
  `signature` is base64(hash(private_key + data + private_key)).
  The LiqPay docs contradict themselves: the text says SHA3-256, every code sample says SHA-1. Outgoing
  signatures use `LIQPAY_SIGNATURE` (default `sha1`); incoming ones are verified against both.
- `/api/billing/webhook` (`server_url`) verifies the signature and `public_key`, checks amount and
  currency against the original payment, and is idempotent. Statuses `success` and `subscribed` (and
  `sandbox` in sandbox mode) grant the plan; `failure` / `error` decline a pending payment;
  `unsubscribed` stops recurring. A callback with `action: regular` is a recurring charge: its payment
  reference is `<order_id>:<payment_id>` and the base is `<order_id>`. That naming of recurring charges
  is NOT confirmed in the docs: check the first real recurring callback in the logs.
  Cancel: `action: unsubscribe` with the base `order_id` to `https://www.liqpay.ua/api/request`
  (request and response shape unverified against a real account).
- Invoices: `/api/billing/invoice` creates a pending `INV-…` payment and shows `INVOICE_DETAILS`.
  The superadmin can also create invoices for a company (any amount) on `/admin`; the company admin sees pending invoices with requisites on `/billing`. Marking one paid grants the plan.
- Lessons moved to the database (`/api/lessons`, `lessonsClient.ts`); `/api/analyze` reads the
  newest 40 active lessons of the company itself.
- Verified end to end against local Postgres and mocks: registration, trial credits, paid lot unlock, free first analysis, signed LiqPay checkout, bad/duplicate/wrong-amount callbacks, recurring callback, unsubscribe, seats, invites, deactivation, Google sign-in and linking, 402 at zero credits, logout.

## Licenses, paid lot details, Google sign-in

- Seats: `companies.seats` (set by the superadmin when creating the company or later on `/admin`, never
  by a plan or the company admin). A seat is an active user or an unused unexpired invite (`seats.ts`). The company admin
  invites, deactivates and reactivates people on `/team`; deactivating deletes the person's sessions,
  blocks password and Google login (`users.active`) and frees the seat. Invite creation, invite
  acceptance (password and Google) and reactivation are all checked against free seats inside a
  transaction that locks the company row. The company admin can rename the company there.
- Free tier: `/search` and its list are free for any signed-in account, even at zero credits; the list
  strips the VIN. Paid: live lot details with photos and comparables (`/api/lot`), VIN history
  (`/api/history`) and the report (`/api/analyze`).
- One credit opens one lot (`lot_unlocks`, keys `lot:<number>` and `vin:<VIN>` in one row). Without
  `unlock: true`, `/api/lot` and `/api/history` return `locked: true` and make no provider call. The first
  analysis of an unlocked lot is free (`analysis_used`, usage kind `analysis_free`; restored if the analysis
  fails), further analyses of it cost one credit. An analysis without an unlock costs one credit as before.
  Trial credits are 3 (`TRIAL_CREDITS` in `plans.ts`); set it to 0 for a fully paywalled product.
- Google sign-in: authorization code flow with PKCE and a `state` check, no extra libraries. `start` sets
  a 10-minute httpOnly cookie `ls_oauth` (state, verifier, invite token, `next`); `callback` exchanges the
  code, reads the profile from the userinfo endpoint over TLS and requires `email_verified`. An existing
  user with the same email is linked (`users.google_sub`); a new user joins through the invite or gets a
  new company (named "Компанія <name>", renamable on `/team`) with trial credits. Google-only accounts
  have no password hash. Google and LiqPay flows were verified only against local mocks.

## Next tasks

1. Run 5–10 lots with known real repair cost and compare against the estimates.
2. Feedback button on the report ("Оцінка неточна") and server storage for corrections.
3. Per-finder usage report for the pilot (data is already in the `usage` table).

## Roadmap for selling to companies

1. Photos in object storage instead of `report_photos` text rows.
2. A shareable report link for the client instead of a PDF.
3. Real prices, a public offer and a privacy policy before taking payments.
5. Verify the auction data provider integration on a real key; add active-lot monitoring.
6. Automatic VIN history through an API provider (for example VinAudit / NMVTIS) next to the manual Carfax upload.
7. Real tiered auction fee tables and delivery rates by state and port.
8. Plug-in hybrids, automatic exchange rates.
9. Calibrating repair estimates against the company's real repair invoices.
