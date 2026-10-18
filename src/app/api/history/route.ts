import { ProviderError, auctionConfigured, callProvider } from "@/lib/provider";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/server";
import { isUnlocked, lotKeys, unlockLot } from "@/lib/unlocks";
import { cleanVin } from "@/lib/vin";
import { type VinHistory, type VinHistoryResponse, mapAuctionHistory, mapVinAudit } from "@/lib/vinhistory";

export const maxDuration = 60;

const VINAUDIT_BASE = (process.env.VINAUDIT_API_URL || "https://api.vinaudit.com").replace(/\/+$/, "");
const TIMEOUT = 25_000;

const vinAuditConfigured = () =>
  Boolean(process.env.VINAUDIT_API_KEY && process.env.VINAUDIT_USER && process.env.VINAUDIT_PASS);

function links(vin: string) {
  const enc = encodeURIComponent(vin);
  return [
    { label: "Carfax", href: `https://www.carfax.com/VehicleHistory/p/Report.cfx?vin=${enc}` },
    { label: "AutoCheck", href: `https://www.autocheck.com/vehiclehistory/?vin=${enc}` },
    { label: "NHTSA: відкличні кампанії", href: `https://www.nhtsa.gov/recalls?vin=${enc}` },
  ];
}

export async function GET() {
  return Response.json({ auction: auctionConfigured(), nmvtis: vinAuditConfigured() });
}

async function vinAudit(vin: string): Promise<unknown> {
  const key = process.env.VINAUDIT_API_KEY!;
  const query = new URL(`${VINAUDIT_BASE}/query.php`);
  query.search = new URLSearchParams({ vin, key, format: "json" }).toString();
  const q = await fetch(query, { signal: AbortSignal.timeout(TIMEOUT), cache: "no-store" });
  const found = (await q.json().catch(() => null)) as { id?: string; success?: boolean; error?: string } | null;
  if (!found?.success || !found.id) return null;
  const report = new URL(`${VINAUDIT_BASE}/v2/pullreport`);
  report.search = new URLSearchParams({
    id: String(found.id),
    vin,
    user: process.env.VINAUDIT_USER!,
    pass: process.env.VINAUDIT_PASS!,
    key,
    format: "json",
  }).toString();
  const r = await fetch(report, { signal: AbortSignal.timeout(TIMEOUT), cache: "no-store" });
  if (!r.ok) return null;
  return r.json().catch(() => null);
}

export async function POST(request: Request) {
  const user = await requireUser("search");
  if (user instanceof Response) return user;
  let body: { vin?: unknown; unlock?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "Не вдалося прочитати запит.");
  }
  const vin = cleanVin(typeof body.vin === "string" ? body.vin : "");
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return fail(400, "VIN має містити 17 символів.");

  const auction = auctionConfigured();
  const nmvtis = vinAuditConfigured();
  const base: VinHistoryResponse = { configured: auction || nmvtis, history: null, links: links(vin) };
  if (!base.configured) return Response.json(base);
  const keys = lotKeys("", vin);
  if (!user.isAdmin && !(await isUnlocked(user.companyId, keys))) {
    if (body.unlock !== true) {
      return Response.json({ ...base, locked: true, credits: user.credits, message: "Історія за VIN доступна за тарифом." });
    }
    if (!(await unlockLot(user.companyId, user.id, keys, `VIN ${vin}`))) {
      return fail(402, "Аналізи за вашим тарифом закінчились. Поповніть їх на сторінці «Оплата».");
    }
    await audit(user, "unlock", `VIN ${vin}`, "історія");
  }

  const [auctionRaw, nmvtisRaw] = await Promise.allSettled([
    auction ? callProvider("/api/v1/get-car-vin", { vin_number: vin }) : Promise.resolve(null),
    nmvtis ? vinAudit(vin) : Promise.resolve(null),
  ]);

  const history: VinHistory = {
    vin,
    sources: [],
    auctionSales: [],
    titleRecords: [],
    brands: [],
    fetchedAt: new Date().toISOString(),
  };
  if (auctionRaw.status === "fulfilled" && auctionRaw.value) {
    history.auctionSales = mapAuctionHistory(auctionRaw.value);
    history.sources.push("історія аукціонів");
  }
  if (nmvtisRaw.status === "fulfilled" && nmvtisRaw.value) {
    const mapped = mapVinAudit(nmvtisRaw.value);
    history.titleRecords = mapped.titleRecords;
    history.brands = mapped.brands;
    history.sources.push("NMVTIS (VinAudit)");
  }

  const failed = [auctionRaw, nmvtisRaw].filter((r) => r.status === "rejected");
  failed.forEach((r) => {
    if (r.status === "rejected" && !(r.reason instanceof ProviderError)) console.error(r.reason);
  });

  if (history.sources.length === 0) {
    return Response.json({
      ...base,
      message: failed.length
        ? "Джерела історії зараз недоступні. Спробуйте пізніше або додайте звіт Carfax вручну."
        : "Записів за цим VIN не знайдено.",
    });
  }
  return Response.json({ ...base, history });
}
