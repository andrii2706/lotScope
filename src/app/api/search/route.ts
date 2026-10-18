import { ProviderError, auctionConfigured, callProvider } from "@/lib/provider";
import { type SearchFilters, type SearchResponse, auctionSearchLinks, filterLots, splitResults } from "@/lib/search";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/server";

export const maxDuration = 60;

const PER_PAGE = 100;
const MAX_RESULTS = 60;

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const int = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : 0;

function sanitize(raw: Partial<SearchFilters> | undefined): SearchFilters {
  const year = new Date().getFullYear() + 1;
  let yearFrom = int(raw?.yearFrom, 0, year);
  let yearTo = int(raw?.yearTo, 0, year);
  if (yearFrom && yearTo && yearFrom > yearTo) [yearFrom, yearTo] = [yearTo, yearFrom];
  return {
    make: text(raw?.make, 40),
    model: text(raw?.model, 60),
    yearFrom,
    yearTo,
    maxMiles: int(raw?.maxMiles, 0, 1_000_000),
    maxBidUsd: int(raw?.maxBidUsd, 0, 1_000_000),
    auction: raw?.auction === "Copart" || raw?.auction === "IAAI" ? raw.auction : "all",
    damages: Array.isArray(raw?.damages) ? raw.damages.map((d) => text(d, 40)).filter(Boolean).slice(0, 10) : [],
    excludeFlood: raw?.excludeFlood !== false,
    excludeDeployed: raw?.excludeDeployed === true,
    runDriveOnly: raw?.runDriveOnly === true,
  };
}

export async function POST(request: Request) {
  const user = await requireUser("search");
  if (user instanceof Response) return user;

  let body: { filters?: Partial<SearchFilters> };
  try {
    body = await request.json();
  } catch {
    return fail(400, "Не вдалося прочитати запит.");
  }
  const filters = sanitize(body.filters);
  if (!filters.make) return fail(400, "Вкажіть хоча б марку авто.");

  const base: SearchResponse = {
    configured: auctionConfigured(),
    lots: [],
    total: 0,
    comparables: null,
    links: auctionSearchLinks(filters),
  };
  if (!base.configured) return Response.json(base);

  const params: Record<string, string | number> = { make: filters.make, page: 1, per_page: PER_PAGE };
  if (filters.model) params.model = filters.model;
  if (filters.yearFrom) params.year_from = filters.yearFrom;
  if (filters.yearTo) params.year_to = filters.yearTo;
  if (filters.auction !== "all") params.auction_name = filters.auction.toLowerCase();

  try {
    const raw = await callProvider("/api/v2/get-cars", params);
    const { active, comparables } = splitResults(raw);
    const lots = filterLots(active, filters);
    return Response.json({
      ...base,
      lots: lots.slice(0, MAX_RESULTS).map((lot) => ({ ...lot, vin: "" })),
      total: lots.length,
      comparables,
      message: lots.length === 0 ? "Активних лотів за цими фільтрами не знайдено. Спробуйте розширити роки чи прибрати фільтри." : undefined,
    } satisfies SearchResponse);
  } catch (error) {
    if (error instanceof ProviderError) return Response.json({ ...base, message: error.message });
    console.error(error);
    return Response.json({ ...base, message: "Не вдалося отримати лоти. Спробуйте ще раз." });
  }
}
