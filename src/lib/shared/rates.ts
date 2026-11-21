import type { Rates } from "@/types/pricing";
const NBU_URL = process.env.NBU_API_URL || "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json";
const NBP_URL = process.env.NBP_API_URL || "https://api.nbp.pl/api/exchangerates/tables/A?format=json";
const TTL = 3 * 3600_000;

let cached: { at: number; rates: Rates } | null = null;

export function parseNbu(raw: unknown): Rates | null {
  if (!Array.isArray(raw)) return null;
  const rate = (cc: string) => {
    const row = raw.find((r) => r && typeof r === "object" && (r as { cc?: unknown }).cc === cc) as { rate?: unknown; exchangedate?: unknown } | undefined;
    return typeof row?.rate === "number" && row.rate > 0 ? row.rate : 0;
  };
  const usdUah = rate("USD");
  const eurUah = rate("EUR");
  const plnUah = rate("PLN");
  if (!usdUah || !eurUah) return null;
  const first = raw.find((r) => r && typeof r === "object" && (r as { cc?: unknown }).cc === "USD") as { exchangedate?: unknown };
  return { usdUah, eurUah, plnUah, date: typeof first?.exchangedate === "string" ? first.exchangedate : "", source: "НБУ" };
}

export function parseNbp(raw: unknown): { usdPln: number; eurPln: number; date: string } | null {
  const table = Array.isArray(raw) ? raw[0] : raw;
  if (!table || typeof table !== "object") return null;
  const list = (table as { rates?: unknown }).rates;
  if (!Array.isArray(list)) return null;
  const mid = (code: string) => {
    const row = list.find((r) => r && typeof r === "object" && (r as { code?: unknown }).code === code) as { mid?: unknown } | undefined;
    return typeof row?.mid === "number" && row.mid > 0 ? row.mid : 0;
  };
  const usdPln = mid("USD");
  const eurPln = mid("EUR");
  if (!usdPln || !eurPln) return null;
  const date = (table as { effectiveDate?: unknown }).effectiveDate;
  return { usdPln, eurPln, date: typeof date === "string" ? date : "" };
}

async function getJson(url: string): Promise<unknown> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store", headers: { accept: "application/json" } });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function currentRates(): Promise<Rates | null> {
  if (cached && Date.now() - cached.at < TTL) return cached.rates;
  const [nbu, nbp] = await Promise.all([getJson(NBU_URL), getJson(NBP_URL)]);
  const ua = parseNbu(nbu);
  const pl = parseNbp(nbp);
  if (!ua && !pl) return cached?.rates ?? null;
  const base: Rates = ua ?? cached?.rates ?? { usdUah: 0, eurUah: 0, plnUah: 0, date: "", source: "" };
  const rates: Rates = pl ? { ...base, usdPln: pl.usdPln, eurPln: pl.eurPln, plDate: pl.date } : { ...base, usdPln: cached?.rates.usdPln, eurPln: cached?.rates.eurPln, plDate: cached?.rates.plDate };
  cached = { at: Date.now(), rates };
  return rates;
}
