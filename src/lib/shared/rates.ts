import type { Rates } from "@/types/pricing";
const NBU_URL = process.env.NBU_API_URL || "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json";
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

export async function currentRates(): Promise<Rates | null> {
  if (cached && Date.now() - cached.at < TTL) return cached.rates;
  try {
    const res = await fetch(NBU_URL, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!res.ok) return cached?.rates ?? null;
    const rates = parseNbu(await res.json());
    if (!rates) return cached?.rates ?? null;
    cached = { at: Date.now(), rates };
    return rates;
  } catch {
    return cached?.rates ?? null;
  }
}
