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
- 56 tests pass (`npm test`): calculations, VIN checks, lot query parsing, provider mapping, lot search, VIN history, roles, password hashing, reset mail, DB SSL config and history file validation;
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
- `@fontsource-variable/geist` (interface font), `@fontsource-variable/geist-mono` (lot numbers, VIN)
- Tests: built-in `node:test`, no extra libraries
- Postgres through `pg` (plain SQL, schema in `db/schema.sql`, applied by `npm run db:migrate`): companies, users, sessions, invites, lessons, reports, report_photos, report_files, audit_log, market_cache, password_resets (`payments`, `usage`, `lot_unlocks` and `companies.plan/credits` are left from the removed billing and are no longer read). Reports and company settings live in the database
- Requires Node.js 20.9+

## Commands

```bash
npm install
docker compose up -d   # local Postgres on 5432
npm run db:migrate
npm run cleanup:stale  # delete files that were moved or removed in this branch (after unpacking a zip over an old copy), and .next
npm run user:password -- you@example.com   # reset a password (scripts/set-password.mjs, same scrypt format as password.ts, deletes the user's sessions)
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
| `DATABASE_URL` | yes | Postgres connection string. Without it nobody can sign in. On Supabase use the shared pooler in transaction mode (port 6543). |
| `DATABASE_SSL`, `DATABASE_SSL_CA` | no | `DATABASE_SSL=off` or `verify` overrides SSL; `DATABASE_SSL_CA` (PEM, `\n` allowed) turns on full certificate verification with that CA. |
| `APP_URL` | for Google and mail | Public base URL; the Google redirect URI and password reset links are built from it. |
| `ADMIN_EMAILS` | yes for the first superadmin | Comma-separated emails that get the derived `superadmin` role and the console at `/admin`. Create the account with `npm run user:password -- email` or Google sign-in. |
| `SESSION_HOURS` | no | Session length in hours, default 8. |
| `SALES_CONTACT` | no | Shown on the login page for companies that want access. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | for Google sign-in | OAuth client (Web application). Redirect URI: `APP_URL/api/auth/google/callback`. |
| `GOOGLE_AUTH_URL`, `GOOGLE_TOKEN_URL`, `GOOGLE_USERINFO_URL` | no | Default to Google's endpoints; used by tests to point at a mock. |
| `AUCTION_API_KEY` | no | Licensed auction data provider key (apiauctions.io). Enables lot autofill, photos and comparable sales. Without it "Знайти лот" only shows search links. |
| `AUCTION_API_URL` | no | Provider base URL, defaults to `https://apiauctions.io`. Used by tests to point at a mock. |
| `VINAUDIT_API_KEY`, `VINAUDIT_USER`, `VINAUDIT_PASS` | no | VinAudit (NMVTIS) for automatic VIN history: title records, brands, junk/salvage/insurance records. `/api/history` calls `GET /v2/query` then `GET /v2/pullreport`, both with `key`, `user`, `pass`, `format=json` (data.vinaudit.com docs, checked 2026-11-07); failures are logged with `[vinaudit]`. Trial 10 queries, then $100/month + $1 per query. Verified only against a local mock. |
| `VINAUDIT_API_URL` | no | VinAudit base URL, defaults to `https://api.vinaudit.com`. |
| `AUTORIA_API_KEY` | no | developers.ria.com key for the Ukrainian market price (sign up at developers.ria.com/signup, key in developers.ria.com/account/; free package 1000 requests, 30 per hour). |
| `AUTORIA_API_URL`, `NBU_API_URL` | no | Override AUTO.RIA and NBU endpoints (tests). |
| `RESEND_API_KEY`, `MAIL_FROM` | for password reset | Resend key and sender from a verified domain. Without them no mail is sent; in development the reset link is logged to the server console. |
| `MAIL_REPLY_TO` | no | Reply-To for system mail (a shared support mailbox, never a personal one). Without it the footer says the mail is automatic and needs no reply. |
| `RESEND_API_URL` | no | Resend base URL, for tests. |
| `ANTHROPIC_PARTS_MODEL` | no | Model for the parts price search (web search must be enabled for the org). |

Never put a real key in `.env.example` and never commit `.env.local`.

`GET /api/analyze` returns `{ configured, model }` — a quick way to check
whether the key was picked up.

## Structure

Modular layout: routes in `app`, UI in `components/<feature>`, every shared type in `types`, static
configuration in `config`, logic in `lib` split by where it runs. Keep it that way:

- a page file holds only the page component; sub-components go to `components/<feature>/`, constants
  and option lists to `config/`, helpers to `lib/`;
- data shapes (API responses, DB rows used by the client, domain objects) live in `src/types/*.ts`
  and are imported with `import type`; only component props and route-local helper types (`Ctx`, DB row
  shapes used inside one route) stay next to their code;
- `lib/server/*` is server-only (db, auth, providers, AI prompt), `lib/client/*` is browser-only
  (stores, hooks, fetch helper), `lib/shared/*` is pure and used by both and by tests;
- inside `src/lib/**` value imports are relative with the `.ts` extension (`node --test` runs these files
  directly); types come from `@/types/...` (type-only imports are erased); everywhere else use `@/...`.

```
src/app/                     routes only (page.tsx, layout.tsx, error.tsx, global-error.tsx, api/**/route.ts)
  page.tsx                   new analysis form
  report/[id]/page.tsx       on-screen report + PrintReport
  history/page.tsx           "Звіти" dashboard
  search/ expert/ settings/ team/ activity/ admin/ admin/company/[id]/
  login/ invite/[token]/ forgot-password/ reset-password/
  api/**/route.ts            handlers exported as `export const GET = route(handleGET)`
src/components/
  layout/                    AppShell (session guard, theme vars), Sidebar, MobileNav, NavList (with skeleton), UserBlock, AuthLayout, Logo
  ui/                        Button, Card, Field, NumberInput, Notice, PageHeader, Segmented, Select, StepCard, StatTile, Combobox, ConfirmDialog, Lightbox, OutLink; index.ts re-exports them
  auth/                      AuthForm, GoogleButton
  analysis/                  LotFinder, PhotoUploader, HistoryUploader, VinHistoryPanel, VinDecodeButton, MarketPrice
  report/                    CostTable, PrintReport, ScoreRing, ExpertReviewCard, HistoryMarket, HistoryDocs, PartsPrices, ReportBlocks (Block, Kpi, Fact, ListBlock, EditField), reportStyles
  admin/                     AuditList, AdminLog, CompanyTable, CreateCompany
  search/                    RunBadge
src/config/                  features (FEATURES switches), navigation (NAV, auth pages, photo), analysis (form options, loading stages), settings (sections, region rows, accents), search (default filters), auth (Google error texts)
src/types/                   report (LotInput, Analysis, Settings, Report…), auction, vin, pricing, auth (Role, Permission, CurrentUser, Me…), admin, team, system, ui
src/lib/server/              auth, db, dbssl, dberror, schema, route, http (fail/readJson/text), scope, members, audit, superadmin, google, password, mail, provider, autoria, reports, prompt, normalize, demo
src/lib/client/              api, me, store, rates (useRates/useCostSettings), lessons, theme, images, useVinHistory, navigation (safeNext)
src/lib/shared/              calc, auctionFees, auctions, auction, search, lots, vin, vinDecode, vinhistory, partsPricing, rates, autoriaMatch, roles, labels, auditLabels, errors, defaults, cars, color, lessons, overrides, expertStats, time
src/proxy.ts                 redirects pages without a session cookie to /login
tests/*.test.mjs             node:test suites importing src/lib/shared and src/lib/server files directly
db/schema.sql                database schema; scripts/migrate.mjs and lib/server/schema.ts apply it
docs/deploy.md               deployment guide (Ukrainian): step-by-step setup of every service, Vercel variables, external URLs, DNS, Supabase and Vercel security
```

## How an analysis runs

1. `page.tsx` collects a `LotInput` and the photos. `lib/client/images.ts` compresses each photo in the
   browser into three copies: `data` (JPEG up to 1568 px, base64, sent for analysis),
   `thumb` (640 px), `cover` (1200 px).
2. POST `/api/analyze` with `{ lot, images, pricing }`. `pricing` comes from the company
   settings: labor rate, paint price per panel, parts preference.
3. `route.ts` checks the session, audits `analyze`, sanitizes and validates the data (`sanitizeLot`), and
   limits photo count and size.
4. With no key, it returns `DEMO_ANALYSIS` with `demo: true`.
5. With a key, it calls `client.messages.create` with `system: SYSTEM_PROMPT`, the lot text,
   photos labelled `Photo N:`, and `output_config.format` of type `json_schema`
   (`ANALYSIS_SCHEMA`). The response is guaranteed valid JSON.
6. `normalizeAnalysis` (`lib/server/normalize.ts`) coerces the result to the type, trims long strings, fixes inverted ranges.
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

## Calculations (`src/lib/shared/calc.ts`)

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

- the auction fee follows the published Copart / IAAI buyer-fee grid (`lib/shared/auctionFees.ts`, taken from third-party copies of the schedules checked in 2026: buyer fee + online bid fee + gate/service + environmental + title); `auctionFeeMode: "manual"` falls back to percent + fixed. Grids change: re-check them against copart.com and iaai.com member fee pages;
- plug-in hybrids are not supported;
- exchange rates come from the NBU (`lib/shared/rates.ts`, `/api/rates`, 3 h cache) when `settings.autoRates` is on; `useCostSettings()` in `lib/client/rates.ts` applies them on the client (report, history, activity); manual rates in settings are the fallback. The NBU response shape is assumed (`[{cc, rate, exchangedate}]`) and was verified only against a mock;
- starting logistics rates in `defaults.ts` are approximate 2026 market figures for a sedan via Klaipeda, not a quote.

## Auctions and regions (`src/lib/shared/auctions.ts`)

- `AuctionName`: `Copart`, `IAAI` (US), `CopartCanada`, `CopartFinland`, `Emirates` (all five come from apiauctions.io: `get-auctions` returns `COPART`, `COPART CANADA`, `COPART FINLAND`, `IAAI`, `EMIRATES AUCTION`), and `Other`. Each has a label, short badge name, provider name, region (`us | ca | eu | ae`) and badge color. `auctionFromProvider` maps provider strings, `auctionLotUrl` builds lot links (copart.ca/lot, copart.fi/en/lot; Emirates falls back to a Google search).
- Search sends `auction_names[]` to `get-active-lots` (that is the documented filter; `get-cars` takes a single `auction_name`). Comparables from `get-cars` are filtered in code to auctions of the same region (`salePricesFrom(raw, allowed)`).
- Provider prices are treated as USD: the docs describe price filters as "integer · USD". Not verified for Canada, Finland and UAE — run `npm run provider:check` and look at one lot per auction.
- Calculation by region (`calc.ts`): `regionalRates` picks inland / ocean (or truck to the Ukrainian border for the EU) / port / delivery from `ca*`, `eu*`, `ae*` settings; US keeps the original keys. Line labels and the first group title follow the region (`REGION_LINES`). The Copart/IAAI fee grid applies only to US auctions and `Other`; other auctions use the percent + fixed from settings.
- Import duty is 0 % for electric cars and for EU-region lots with `lot.eur1` (checkbox "Авто виготовлене в ЄС, продавець дасть EUR.1", shown only for EU lots). Origin is the plant country, not the auction country.
- VIN decoder: `/api/vin-decode` → provider `/api/v2/vin-decoding` (`lib/shared/vinDecode.ts`), button "Розшифрувати VIN" under the VIN field fills empty make/model, year, engine, fuel and stores `lot.plantCountry` (`isEuPlant`). Verified only against a mock built from the documented example.
- Regional starting rates are rough (Canada from Meest's 3 499 CAD Toronto/Montreal → Chornomorsk, 2025; UAE from a 2026 dealer article, 1 800–2 500 $; no fresh EU figure). IAA Canada, Manheim, OPENLANE, ACV and other European platforms have no legitimate data source yet (research of 2026-11-03).

## Feature switches and Carfax files

- `src/config/features.ts` holds `FEATURES` (code switches, change and redeploy): `marketPriceAuto` (AUTO.RIA market price) and `vinHistoryAuto` (automatic VIN history: VinAudit + provider auction history). Both are `false` since 2026-11-07 because they cost money: the form hides `MarketPrice` and `VinHistoryPanel`, `useVinHistory` does not call the API, `/api/market` answers `configured: false`, `/api/history` POST answers `configured: false` and GET returns `enabled`. Step 5 of the form is then "Звіт Carfax чи AutoCheck" with only `HistoryUploader`.
- Carfax/AutoCheck files are stored with the report: after `POST /api/reports` the client (`attachHistoryDocs` in `store.ts`) sends each file to `POST /api/reports/[id]/file` (author only, max 4, one file per request to stay under the Vercel 4.5 MB body limit, PDF up to 3 MB in `HistoryUploader`). `parseHistoryDoc` (`lib/server/reports.ts`) checks the declared type against magic bytes (PDF, JPEG, PNG, WEBP) and cleans the name. Rows go to `report_files`, metadata `{n, name, mediaType}` is appended to `reports.body.historyDocs`, and `rowToReport` turns it into `historyDocs: [{name, mediaType, url}]`. `GET /api/reports/[id]/file/[n]` serves the file with the report scope check, `nosniff` and `content-disposition: inline`. Unsaved reports keep data URLs and open them as blobs (`components/report/HistoryDocs.tsx`). New reports start with `historyDocs: []`, so a name in `historyFiles` without a stored doc is shown as "не вдалося зберегти"; old reports without `historyDocs` show nothing.
- `next.config.ts` adds security headers to every response (HSTS, `X-Frame-Options: DENY`, CSP `frame-ancestors 'none'; base-uri 'self'`, `nosniff`, Referrer-Policy, Permissions-Policy, `X-Robots-Tag: noindex`) and `poweredByHeader: false`; `app/robots.ts` disallows everything and `proxy.ts` skips `robots.txt`. Do not add a strict CSP without testing the theme boot script and the PDF viewer.
- `.env.production.example` is the template of production variables to paste into Vercel.

## Market and parts prices

- `/api/market` (`lib/server/autoria.ts`, pure helpers in `lib/shared/autoriaMatch.ts`): AUTO.RIA API (`api_key` query param). Marks and models dictionaries (`/auto/categories/1/marks`, `/auto/categories/1/marks/{id}/models`) are cached in memory and in `market_cache` for 30 days. The price comes from the documented average price endpoint `GET /auto/average_price?marka_id&model_id&yers` (response `total`, `arithmeticMean`, `interQuartileMean`, `percentiles`, `prices`, `classifieds`; 400 `{"message":"Not Enough Data"}` when the sample is too small). We request the exact year; if it has fewer than 5 prices we add year−1 and year+1 and compute median and quartiles from the merged `prices` (`statsFrom`). One lookup costs 1–3 requests (the free key allows about 30 per hour and 1000 per month, and going over blocks the key for a while), the result is cached 7 days. The endpoint does not filter damaged or uncleared cars, the UI says so. HTTP-200 `noticeData` errors, 4xx `{error:{code,message}}`, `OVER_RATE_LIMIT`/429 and non-JSON answers are logged with `[autoria]` (without the key) and shown as a friendly message. The previous search + `/auto/info` approach used up to 11 requests per lookup and hit the hourly limit; it was removed. Verified only against a local mock built from the README of ria-com/auto-ria-rest-api; check one real lookup and the `[autoria]` log after setting `AUTORIA_API_KEY`.
- `/api/parts` (`lib/shared/partsPricing.ts`, `components/report/PartsPrices.tsx`): Claude with the server `web_search` tool limited to allegro.pl, olx.ua, olx.pl prices the `replace` parts. Offers whose URL did not appear in the search results are dropped. Code converts currencies, adds Polish delivery (`partsDeliveryPlUsd`) and labor (`laborHours × laborRateUsd`, paint per panel), and computes the revised repair range as the AI range plus the per-part difference. "Застосувати до розрахунку" puts that range into the edit draft. Results are stored in `report.partsSearch` for saved reports. Allegro and OLX have no public search API for third parties (Allegro limits `GET /offers/listing` to verified partner apps), so do not scrape them.

## Prompt and schema (`src/lib/server/prompt.ts`)

`SYSTEM_PROMPT` is written in English and explains the situation to the model: who uses the
report, why accuracy matters, which areas auction photos usually hide, that repair prices must
be Ukrainian, and that listing details are typed by a human and may contradict the photos.
The model returns every text field in Ukrainian.

`ANALYSIS_SCHEMA` is the JSON schema of the response. Structured output limitations:
`minimum`, `maximum` and `minLength` are not supported, so ranges are checked in `normalize.ts`.

If you change the schema, update `types/report.ts` (`Analysis`), `normalize.ts` and `demo.ts` together.

## Theme

A light business SaaS interface by default (mocks: Design artifact "LotScope — нові моки UI"), a dark theme on demand, a light document on paper.

- Layout: `AppShell` renders a 248px white sidebar on `lg+` and a 56px top bar with a drawer below it; content is `max-w-[1180px]`. The sidebar is always rendered on app pages: while `/api/auth/me` loads it shows a skeleton, if it fails it keeps the shell, shows a notice and retries every 5 s, and without a session it redirects to `/login`. Page content renders only once the user is known. Auth pages (`/login`, `/invite`, `/forgot-password`, `/reset-password`) use `AuthLayout` (form left, photo right, no theme toggle).
- No native dropdowns: use `Select` (`components/ui/Select.tsx`: button with `role="combobox"`, listbox rendered in a portal with fixed position so cards with `overflow-hidden` do not clip it, flips upward near the bottom, keyboard: arrows, Home/End, Enter/Space, Escape, type-ahead) instead of `<select>`, and `Combobox` (`minChars={0}` shows the whole list on focus) instead of `<datalist>`. `.control` sets `background-color`, never the `background` shorthand.
- External links go through `OutLink` (`components/ui/OutLink.tsx`, type `OutboundLink`). Carfax and AutoCheck are geo-blocked from Ukraine and have no working deep link by VIN, so `lib/shared/historySites.ts` points to VIN-entry pages, marks them `note: "VPN США"` (shown as a badge) and lists carVertical and ClearVIN first because they work from Ukraine. Every history link sets `copy: vin`: the click copies the VIN and shows a short toast. Never link to `Report.cfx?vin=` or `autocheck.com/vehiclehistory/?vin=`.
- Lots without an auction date are still active and can be analysed. `newestHistory` (`lib/shared/auction.ts`) returns an undated, not-sold history entry first (that is the current listing), then the newest by `sale_date`/`auction_date`; `salePricesFrom` passes `datedOnly` so sold prices still come from dated sales. The search table shows «дата ще не призначена» for them.
- Look: Geist, page title 28px/700 with `-0.02em`, cards white with a 1px `--line` border and 16px radius, buttons 40px high with 10px radius, statuses as pills with text. The logo square is lime `#c8f542`; the default brand/accent color is `#2b59ff`.
- `Settings.theme` is `light | dark | system`, default `light`. The sidebar button toggles light/dark; settings have all three. `useResolvedTheme` sets `data-theme` on `<html>`; `THEME_BOOT_SCRIPT` in the layout `<head>` sets it before paint (default light).
- Light values live in `:root`, dark ones in `:root[data-theme="dark"]` in `globals.css`. When you add a color variable, define it for light, dark and print.
- `accentText(hex, theme)` darkens light brand colors on the light theme so text stays readable.

- All colors are CSS variables exposed to Tailwind through `@theme inline`. Classes: `bg-paper`, `bg-surface`, `bg-panel2`, `border-line`, `border-line2`,
  `text-ink`, `text-on-ink`, `text-muted`, `text-faint`, `bg-scrim`, `text-good|warn|bad`,
  `bg-good-bg|warn-bg|bad-bg`.
- The `@media print` block redefines these variables to light values. So do not use hard-coded
  `bg-white`, `text-white` or `bg-black` for interface elements — use the theme variables.
  The exceptions are captions over photos (`bg-scrim text-white`) and auction badges (white text on `AUCTIONS[x].color`).
- Company brand color: `AppShell` sets `--accent`, `--accent-ink` (text on an accent background)
  and `--accent-text` (accent-colored text) via `lib/shared/color.ts`. Classes:
  `bg-accent`, `text-accent-ink`, `text-accent-text`. For text and borders use `accent-text`,
  not `accent`: a company may pick a light color.
- Accent should be rare: primary buttons, the active progress, the most likely scenario.
- Chart colors `--series-1..4` are validated for color-vision-deficiency separation, separately
  for the dark and light backgrounds. Do not change them by eye.
- Status is never conveyed by color alone: there is always an icon or a label next to it.
- `.no-print` hides an element on paper, `.print-only` shows it only on paper.
- No native browser dialogs: use `confirmDialog({ title, message, confirmLabel, tone })` from `components/ui/ConfirmDialog.tsx` (host mounted in `AppShell`) instead of `window.confirm`/`alert`, `Lightbox` for photos, and forms use `noValidate` with in-app error messages instead of browser validation bubbles.

The report exists in two views built from the same data: the on-screen one in
`report/[id]/page.tsx` and the printed one in `components/report/PrintReport.tsx`. When you add a block to the
report, add it to both.

## Storage (`src/lib/client/store.ts`)

Reports (`reports` + `report_photos`) and company settings (`companies.settings`, jsonb) are in
Postgres. `store.ts` keeps the same synchronous API as before (`useReports`, `useSettings`,
`saveSettings`, `getSettings`, `updateReport`, `deleteReport`, `useHydrated`) as a client cache:
it loads `/api/reports` and `/api/settings` when the signed-in user changes (`onUserChange` in
`me.ts`), updates optimistically and syncs in the background. `useHydrated()` is true once the
first load finished. Only `theme` and `expertName` stay in `localStorage` (`lotscope.prefs.v1`).
`saveReport(report, persist)` stores to the server when `persist`, otherwise keeps an in-memory
report with id `tmp-…` (users without the `save` permission). Report photos are served by
`/api/reports/[id]/photo/[n]` as private images, so `Report.photos` are URLs for saved reports
and data URLs for unsaved ones. A report is visible to its author, to a team lead when the author is in the lead's team (`lib/server/scope.ts`), and to roles with `reportsAll`
(company admin, expert).

## Accounts and access

LotScope is sold to companies under a contract outside the app: there are no payments, plans, credits or report limits inside it. Access is invite-only.

- Auth is hand-written: scrypt password hashes (`lib/server/password.ts`), random session tokens stored as
  SHA-256 in `sessions`, httpOnly cookie `ls_session` (Secure when the request is https).
  `src/proxy.ts` only checks that the cookie exists and redirects pages to `/login`;
  every API route checks the session with `requireUser(permission?)`. Login has an in-memory rate
  limit (8 attempts / 15 min per email).
- Roles (`src/lib/shared/roles.ts`): `superadmin` (derived from `ADMIN_EMAILS`, not stored), `admin`
  (company admin), `lead` (team lead), `manager`, `expert`, `user` (legacy personal accounts, no new ones are created). The permission
  matrix is `MATRIX`; `can(actor, permission)` checks only the role.
  `requireUser("permission")` enforces it on the server (401 `code: session`, 403 `code: suspended` or `forbidden`).
  The client hides navigation and redirects by `routePermission` in `AppShell`. The company admin deliberately cannot search or analyze (change `MATRIX` to widen it).
- Getting access: the superadmin creates a company on `/admin` (name only) and gets a one-time admin invite link (7 days) to send to the client; on the company page the superadmin creates profiles (invite links for `admin`, `manager`, `expert`) and deletes them. There is no seat limit. Lessons are written by `expert` only.
- Teams: `teams (id, company_id, name)`, `users.team_id`, `invites.team_id`. The company admin creates and deletes teams on `/team`, invites `lead` (team required), `manager` (team optional) or `expert` (no team), and changes anyone's role and team. A `lead` has search, analyze, save, pdf, `team` and `activity`, but every list is scoped to `users.team_id = lead.team_id`: `/api/reports` and report photos (`lib/server/scope.ts`), `/api/activity` (members and log), `/api/team` (members, invites). A lead can invite only `manager` into his own team and activate, deactivate or delete only managers of his team; creating teams and changing roles or teams answers 403. A lead without a team sees only his own reports.
- No public registration: `/register` and `/api/auth/register` are removed. Google sign-in without an invite works only for existing users or `ADMIN_EMAILS` (creates a personal "LotScope" company); everyone else is sent back with `google_noaccess`. `npm run user:password -- email` creates the superadmin account when the email is in `ADMIN_EMAILS` and does not exist yet. The login page shows `SALES_CONTACT`.
- DB SSL: `lib/server/dbssl.ts` strips `sslmode` from `DATABASE_URL` and uses `ssl: {rejectUnauthorized:false}` for non-local hosts (`DATABASE_SSL=off|verify` overrides); with `DATABASE_SSL_CA` it uses `{ca, rejectUnauthorized:true}`. `migrate.mjs` and `set-password.mjs` do the same. The CA path was not tested against a real Supabase project.
- The end of `db/schema.sql` enables RLS on every table in `public` and, when the Supabase roles `anon`/`authenticated` exist, revokes their privileges (also default privileges). The app connects as the table owner, so RLS does not affect it; a separate app role would need to own the tables or have `BYPASSRLS`. Deployment and security setup for Vercel, Supabase, DNS and mail: `docs/deploy.md`.
- Sessions last `SESSION_HOURS` (default 8, absolute from login, never extended; `currentUser` also checks `created_at + SESSION_HOURS`): DB `expires_at`, cookie expiry, a client timer in
  `AppShell` and `api()` redirect to `/login?error=session`.
- Suspension: `companies.suspended` makes `requireUser` answer 403 `suspended`, deletes sessions, and
  `AppShell` shows a block screen; people can still log in to see it.
- Audit: `audit(actor, action, target, detail)` writes `audit_log` (logins, analyses, lot openings, report
  save/delete/pdf, invites, user changes, team create/rename/delete and membership, suspension). Usage numbers on `/admin`, `/admin/company/[id]`, `/team` and `/activity` count `audit_log` rows with `action = 'analyze'`. The company admin sees the
  company slice on `/activity`, the superadmin everything on `/admin`. The PDF event is reported by
  the client (`/api/reports/[id]/event`).
- Password reset: `/forgot-password` → `/api/auth/forgot` (same answer whether or not the account exists; 3 per email and 10 per IP per hour, in memory) creates a random token, stores only its SHA-256 in `password_resets` (60 min, one use, previous unused tokens deleted) and sends a Resend mail (`lib/server/mail.ts`, `resetEmail`) with `APP_URL/reset-password?token=…`. `/reset-password` checks the token (`GET /api/auth/reset`), removes it from the address bar, and `POST /api/auth/reset` sets the new password in a transaction, marks the token used, deletes all sessions of the user and audits `password_reset`. Google-only accounts can set a password this way. Verified against a local Resend mock only.
- Lessons are in the database (`/api/lessons`, `lib/client/lessons.ts`); `/api/analyze` reads the
  newest 40 active lessons of the company itself.

## Google sign-in

- Seats were removed: `companies.seats` stays in the schema but nothing reads it. Deactivating a person deletes their sessions and blocks password and Google login (`users.active`).
- Lot details with photos and comparables (`/api/lot`), VIN history (`/api/history`) and analyses are unlimited for roles that have the permission.
- Google sign-in: authorization code flow with PKCE and a `state` check, no extra libraries. `start` sets
  a 10-minute httpOnly cookie `ls_oauth` (state, verifier, invite token, `next`); `callback` exchanges the
  code, reads the profile from the userinfo endpoint over TLS and requires `email_verified`. An existing
  user with the same email is linked (`users.google_sub`); a new user joins through the invite; without an invite only `ADMIN_EMAILS` may sign up. Google-only accounts
  have no password hash. The Google flow was verified only against local mocks.

## Errors

User-facing text never mentions the backend: no environment variables, keys, database, server, providers or model vendors. Everything technical goes to logs.

- Every API handler is exported as `export const GET = route(handleGET)` (`lib/server/route.ts`). An unexpected exception becomes `{ error: "Щось пішло не так. Спробуйте ще раз." }` with status 500 and a `[api] METHOD /path` log line; a Postgres or connection error becomes `{ error, code }` with a `[db] …` log line (`lib/server/dberror.ts`): connect/schema → 503 "Сервіс тимчасово недоступний…", unique → 409, foreign key → 409, bad input → 400, statement timeout → 504.
- Schema drift (missing table or column, SQLSTATE 42P01/42703/42704/42883) triggers `applySchemaOnce()`, which runs `db/schema.sql`; GET requests and `/api/auth/me` are retried after it. Deployments where the build-time migration was skipped heal on the first request. `npm run db:migrate` is still the normal way.
- `fail(status, message, log)` returns a friendly message and logs `log` (`[api] status message detail`). Use it for third-party failures: Anthropic (key, limits, refusals), provider (`ProviderError(message, detail)`), AUTO.RIA (`RiaError`), parts search.
- Client: `api()` and the direct `fetch` callers use `responseMessage(url, status, data, fallback)`: the server's message is shown only if it is Ukrainian text, otherwise a status-based message; `userMessage(error, fallback)` maps network failures (`TypeError`) to "Немає з'єднання з інтернетом…", timeouts to "Відповідь затримується…", and never shows English exception text. Both log the raw details with the `[LotScope]` prefix in the browser console.
- `app/error.tsx` (in-app card with "Спробувати ще раз") and `app/global-error.tsx` (own document) catch render errors and log them.
- Configuration notices (demo mode, auction data, VIN history) say only that a feature is unavailable or not connected; the reason is in the server log.

## Next tasks

1. Run 5–10 lots with known real repair cost and compare against the estimates.
2. Feedback button on the report ("Оцінка неточна") and server storage for corrections.
3. Per-finder usage report for the pilot (data is already in `audit_log`).

## Roadmap for selling to companies

1. Photos in object storage instead of `report_photos` text rows.
2. A shareable report link for the client instead of a PDF.
3. A contract template and a privacy policy for client companies.
5. Verify the auction data provider integration on a real key; add active-lot monitoring.
6. Automatic VIN history through an API provider (for example VinAudit / NMVTIS) next to the manual Carfax upload.
7. Real tiered auction fee tables and delivery rates by state and port.
8. Plug-in hybrids, automatic exchange rates.
9. Calibrating repair estimates against the company's real repair invoices.
