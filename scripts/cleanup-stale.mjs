import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");

const STALE = [
  "src/app/api/auth/register/route.ts",
  "src/app/api/billing/cancel/route.ts",
  "src/app/api/billing/checkout/route.ts",
  "src/app/api/billing/invoice/route.ts",
  "src/app/api/billing/return/route.ts",
  "src/app/api/billing/route.ts",
  "src/app/api/billing/webhook/route.ts",
  "src/app/billing/page.tsx",
  "src/app/register/page.tsx",
  "src/components/AppShell.tsx",
  "src/components/AuditList.tsx",
  "src/components/AuthForm.tsx",
  "src/components/Combobox.tsx",
  "src/components/ConfirmDialog.tsx",
  "src/components/CostTable.tsx",
  "src/components/ExpertReviewCard.tsx",
  "src/components/GoogleButton.tsx",
  "src/components/HistoryMarket.tsx",
  "src/components/HistoryUploader.tsx",
  "src/components/Lightbox.tsx",
  "src/components/LotFinder.tsx",
  "src/components/MarketPrice.tsx",
  "src/components/PartsPrices.tsx",
  "src/components/PhotoUploader.tsx",
  "src/components/PrintReport.tsx",
  "src/components/ScoreRing.tsx",
  "src/components/UserMenu.tsx",
  "src/components/VinDecodeButton.tsx",
  "src/components/VinHistoryPanel.tsx",
  "src/components/ui.tsx",
  "src/lib/api.ts",
  "src/lib/auction.ts",
  "src/lib/auctionFees.ts",
  "src/lib/auctions.ts",
  "src/lib/audit-labels.ts",
  "src/lib/audit.ts",
  "src/lib/auth.ts",
  "src/lib/autoria.ts",
  "src/lib/autoriaMatch.ts",
  "src/lib/billing.ts",
  "src/lib/calc.ts",
  "src/lib/cars.ts",
  "src/lib/color.ts",
  "src/lib/db.ts",
  "src/lib/dberror.ts",
  "src/lib/dbssl.ts",
  "src/lib/defaults.ts",
  "src/lib/demo.ts",
  "src/lib/errors.ts",
  "src/lib/google.ts",
  "src/lib/images.ts",
  "src/lib/labels.ts",
  "src/lib/lessons.ts",
  "src/lib/lessonsClient.ts",
  "src/lib/liqpay.ts",
  "src/lib/lpConfig.ts",
  "src/lib/mail.ts",
  "src/lib/me.ts",
  "src/lib/members.ts",
  "src/lib/normalize.ts",
  "src/lib/partsPricing.ts",
  "src/lib/password.ts",
  "src/lib/plans.ts",
  "src/lib/prompt.ts",
  "src/lib/provider.ts",
  "src/lib/rates.ts",
  "src/lib/ratesClient.ts",
  "src/lib/reports.ts",
  "src/lib/roles.ts",
  "src/lib/route.ts",
  "src/lib/schema.ts",
  "src/lib/scope.ts",
  "src/lib/search.ts",
  "src/lib/seats.ts",
  "src/lib/server.ts",
  "src/lib/store.ts",
  "src/lib/superadmin.ts",
  "src/lib/theme.ts",
  "src/lib/types.ts",
  "src/lib/unlocks.ts",
  "src/lib/useVinHistory.ts",
  "src/lib/vin.ts",
  "src/lib/vinDecode.ts",
  "src/lib/vinhistory.ts",
  "tests/billing.test.mjs",
];

const removed = [];
for (const rel of STALE) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  if (!dryRun) fs.rmSync(file);
  removed.push(rel);
}

const dirs = ["src/app/api/billing", "src/app/billing", "src/app/register", "src/app/api/auth/register"];
for (const rel of dirs) {
  const dir = path.join(root, rel);
  if (fs.existsSync(dir) && !dryRun) fs.rmSync(dir, { recursive: true, force: true });
}

const cache = path.join(root, ".next");
if (fs.existsSync(cache) && !dryRun) fs.rmSync(cache, { recursive: true, force: true });

if (removed.length === 0) console.log("Застарілих файлів немає.");
else console.log([`${dryRun ? "Буде видалено" : "Видалено"} застарілих файлів: ${removed.length}`, ...removed.map((f) => `  ${f}`)].join("\n"));
if (!dryRun) console.log("Кеш .next очищено. Перезапустіть npm run dev.");
