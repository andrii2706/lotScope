import { ProviderError, auctionConfigured, callProvider } from "@/lib/provider";
import { priceStats, salePricesFrom } from "@/lib/auction";
import { type SearchFilters, type SearchResponse, activeFrom, auctionSearchLinks, filterLots, listFrom, paginationOf, sampleKeys } from "@/lib/search";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/server";

export const maxDuration = 60;

const PER_PAGE = 50;
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

  let body: { filters?: Partial<SearchFilters>; page?: unknown; loose?: unknown };
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

  const page = int(body.page, 1, 200) || 1;
  const params: Record<string, string | number> = { make: filters.make, page, per_page: PER_PAGE };
  if (filters.yearFrom) params.year_from = filters.yearFrom;
  if (filters.yearTo) params.year_to = filters.yearTo;
  if (filters.auction !== "all") params.auction_name = filters.auction.toUpperCase();

  const comparableParams: Record<string, string | number> = { make: filters.make, page: 1, per_page: PER_PAGE };
  if (filters.model) comparableParams.model = filters.model.split(/\s+/)[0];
  if (filters.yearFrom) comparableParams.year_from = filters.yearFrom;
  if (filters.yearTo) comparableParams.year_to = filters.yearTo;

  try {
    let loose = body.loose === true || !filters.model;
    let raw: unknown;
    if (!loose) {
      raw = await callProvider("/api/v2/get-active-lots", { ...params, model: filters.model });
      if (listFrom(raw).length === 0 && page === 1) loose = true;
    }
    const looseModel = Boolean(filters.model) && loose;
    if (loose) raw = await callProvider("/api/v2/get-active-lots", params);
    const sold = page === 1 ? await callProvider("/api/v2/get-cars", comparableParams).catch(() => null) : null;

    const received = listFrom(raw).length;
    const pagination = paginationOf(raw);
    const lots = filterLots(activeFrom(raw), filters, looseModel);
    if (received > 0 && lots.length === 0) console.error("Provider: lots received but filtered out or unmapped; keys:", sampleKeys(raw));
    const comparables = priceStats(salePricesFrom(sold));
    return Response.json({
      ...base,
      lots: lots.slice(0, MAX_RESULTS).map((lot) => ({ ...lot, vin: "" })),
      total: lots.length,
      comparables,
      page,
      totalPages: pagination.totalPages,
      providerTotal: pagination.total,
      loose,
      message:
        lots.length === 0
          ? received > 0
            ? pagination.totalPages > page
              ? "На цій сторінці жоден лот не пройшов ваші фільтри. Перейдіть на наступну сторінку або послабте фільтри."
              : "Лоти знайдено, але жоден не пройшов ваші фільтри. Послабте фільтри (пробіг, ставка, пошкодження)."
            : "Активних лотів за цими фільтрами не знайдено. Спробуйте розширити роки чи прибрати фільтри."
          : undefined,
    } satisfies SearchResponse);
  } catch (error) {
    if (error instanceof ProviderError) return Response.json({ ...base, message: error.message });
    console.error(error);
    return Response.json({ ...base, message: "Не вдалося отримати лоти. Спробуйте ще раз." });
  }
}
