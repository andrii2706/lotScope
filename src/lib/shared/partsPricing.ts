import type { PartCurrency, PartOffer, PartPrice, PartRange, PartSource } from "@/types/pricing";
import type { DamagedPart, Settings } from "@/types/report";

const SOURCES: PartSource[] = ["Allegro", "OLX"];
const CURRENCIES: PartCurrency[] = ["PLN", "UAH", "USD", "EUR"];
const HOSTS = /(^|\.)(allegro\.pl|olx\.ua|olx\.pl)$/i;

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

export function canonicalUrl(raw: string): string {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || !HOSTS.test(u.hostname)) return "";
    return `https://${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/$/, "")}`;
  } catch {
    return "";
  }
}

export function toUsd(price: number, currency: PartCurrency, s: Pick<Settings, "plnUsd" | "usdUah" | "eurUsd">): number {
  if (currency === "USD") return price;
  if (currency === "EUR") return price * s.eurUsd;
  if (currency === "PLN") return price * s.plnUsd;
  return s.usdUah > 0 ? price / s.usdUah : 0;
}

export function parsePartsJson(text: string, seenUrls: Set<string>, partNames: string[]): PartPrice[] {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  const list = isRec(raw) && Array.isArray(raw.parts) ? raw.parts : [];
  const out: PartPrice[] = [];
  for (const name of partNames) {
    const item = list.find((p) => isRec(p) && str(p.part, 120).toLowerCase() === name.toLowerCase()) as Rec | undefined;
    const offers: PartOffer[] = [];
    for (const o of Array.isArray(item?.offers) ? item.offers : []) {
      if (!isRec(o)) continue;
      const url = str(o.url, 500);
      const canon = canonicalUrl(url);
      if (!canon || !seenUrls.has(canon)) continue;
      const source = SOURCES.find((s) => s === o.source) ?? (/allegro/.test(canon) ? "Allegro" : "OLX");
      const currency = CURRENCIES.find((c) => c === o.currency);
      const price = num(o.price);
      if (!currency || !price) continue;
      offers.push({
        source,
        title: str(o.title, 160),
        price,
        currency,
        url,
        condition: o.condition === "used" || o.condition === "new" ? o.condition : "unknown",
      });
    }
    const hMin = Math.min(40, num(item?.laborHoursMin));
    const hMax = Math.min(60, Math.max(hMin, num(item?.laborHoursMax)));
    out.push({
      part: name,
      offers: offers.slice(0, 6),
      laborHoursMin: hMin,
      laborHoursMax: hMax,
      paint: item?.paint === true,
      note: str(item?.note, 300),
    });
  }
  return out;
}

function typical(values: number[]): [number, number] {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length >= 4) {
    const q = (p: number) => sorted[Math.round((sorted.length - 1) * p)];
    return [q(0.25), q(0.75)];
  }
  return [sorted[0], sorted[sorted.length - 1]];
}

export function partRange(p: PartPrice, s: Pick<Settings, "plnUsd" | "usdUah" | "eurUsd" | "laborRateUsd" | "paintPerPanelUsd" | "partsDeliveryPlUsd">): PartRange {
  const prices = p.offers.map((o) => toUsd(o.price, o.currency, s) + (o.source === "Allegro" ? s.partsDeliveryPlUsd : 0)).filter((v) => v > 0);
  if (!prices.length) return { part: p.part, found: false, partMinUsd: 0, partMaxUsd: 0, minUsd: 0, maxUsd: 0 };
  const [lo, hi] = typical(prices);
  const paint = p.paint ? s.paintPerPanelUsd : 0;
  return {
    part: p.part,
    found: true,
    partMinUsd: Math.round(lo),
    partMaxUsd: Math.round(hi),
    minUsd: Math.round(lo + p.laborHoursMin * s.laborRateUsd + paint),
    maxUsd: Math.round(hi + p.laborHoursMax * s.laborRateUsd + paint),
  };
}

export function revisedRepair(
  analysis: { repairMinUsd: number; repairMaxUsd: number; damagedParts: DamagedPart[] },
  ranges: PartRange[],
): { minUsd: number; maxUsd: number; replaced: number } | null {
  let dMin = 0;
  let dMax = 0;
  let replaced = 0;
  for (const r of ranges) {
    if (!r.found) continue;
    const ai = analysis.damagedParts.find((d) => d.part === r.part);
    if (!ai) continue;
    dMin += r.minUsd - ai.costMinUsd;
    dMax += r.maxUsd - ai.costMaxUsd;
    replaced++;
  }
  if (!replaced) return null;
  const minUsd = Math.max(0, Math.round(analysis.repairMinUsd + dMin));
  const maxUsd = Math.max(minUsd, Math.round(analysis.repairMaxUsd + dMax));
  return { minUsd, maxUsd, replaced };
}
