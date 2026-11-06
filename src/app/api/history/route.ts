import { ProviderError, auctionConfigured, callProvider } from "@/lib/server/provider";
import { audit } from "@/lib/server/audit";
import { requireUser } from "@/lib/server/auth";
import { fail } from "@/lib/server/http";
import { cleanVin } from "@/lib/shared/vin";
import { historyLinks } from "@/lib/shared/historySites";
import { mapAuctionHistory, mapVinAudit } from "@/lib/shared/vinhistory";
import { route } from "@/lib/server/route";
import { FEATURES } from "@/config/features";
import type { VinHistory, VinHistoryResponse } from "@/types/vin";

export const maxDuration = 60;

const VINAUDIT_BASE = (process.env.VINAUDIT_API_URL || "https://api.vinaudit.com").replace(/\/+$/, "");
const TIMEOUT = 25_000;

const vinAuditConfigured = () =>
  Boolean(process.env.VINAUDIT_API_KEY && process.env.VINAUDIT_USER && process.env.VINAUDIT_PASS);

async function handleGET() {
  return Response.json({ enabled: FEATURES.vinHistoryAuto, auction: auctionConfigured(), nmvtis: vinAuditConfigured() });
}

async function vinAudit(vin: string): Promise<unknown> {
  const auth = { key: process.env.VINAUDIT_API_KEY!, user: process.env.VINAUDIT_USER!, pass: process.env.VINAUDIT_PASS! };
  const query = new URL(`${VINAUDIT_BASE}/v2/query`);
  query.search = new URLSearchParams({ vin, ...auth, format: "json" }).toString();
  const q = await fetch(query, { signal: AbortSignal.timeout(TIMEOUT), cache: "no-store" });
  const found = (await q.json().catch(() => null)) as { id?: string; success?: boolean; error?: string } | null;
  if (!found?.success || !found.id) {
    console.error(`[vinaudit] /v2/query ${vin} -> ${q.status} ${found?.error ?? "без id"}`);
    return null;
  }
  const report = new URL(`${VINAUDIT_BASE}/v2/pullreport`);
  report.search = new URLSearchParams({ id: String(found.id), vin, ...auth, format: "json" }).toString();
  const r = await fetch(report, { signal: AbortSignal.timeout(TIMEOUT), cache: "no-store" });
  const data = (await r.json().catch(() => null)) as { success?: boolean; error?: string } | null;
  if (!r.ok || !data || data.success === false) {
    console.error(`[vinaudit] /v2/pullreport ${vin} -> ${r.status} ${data?.error ?? "відповідь не JSON"}`);
    return null;
  }
  return data;
}

async function handlePOST(request: Request) {
  const user = await requireUser("search");
  if (user instanceof Response) return user;
  let body: { vin?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "Не вдалося прочитати запит.");
  }
  const vin = cleanVin(typeof body.vin === "string" ? body.vin : "");
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return fail(400, "VIN має містити 17 символів.");

  const auction = FEATURES.vinHistoryAuto && auctionConfigured();
  const nmvtis = FEATURES.vinHistoryAuto && vinAuditConfigured();
  const base: VinHistoryResponse = { configured: auction || nmvtis, history: null, links: historyLinks(vin) };
  if (!base.configured) return Response.json(base);
  await audit(user, "unlock", `VIN ${vin}`, "історія");

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

export const GET = route(handleGET);
export const POST = route(handlePOST);
