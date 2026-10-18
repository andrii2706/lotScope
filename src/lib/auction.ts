import type { FuelType, LotInput } from "./types";

export type AuctionName = LotInput["auction"];

export interface LotQuery {
  kind: "vin" | "lot" | "unknown";
  value: string;
  auction: AuctionName;
}

export interface SearchLink {
  label: string;
  href: string;
  group: "auction" | "history" | "web";
}

export interface PriceStats {
  count: number;
  medianUsd: number;
  p25Usd: number;
  p75Usd: number;
  minUsd: number;
  maxUsd: number;
}

export interface Comparables {
  source: string;
  query: string;
  stats: PriceStats;
}

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

export function parseLotQuery(input: string): LotQuery {
  const raw = input.trim();
  if (!raw) return { kind: "unknown", value: "", auction: "Other" };

  const lower = raw.toLowerCase();
  const auction: AuctionName = lower.includes("copart")
    ? "Copart"
    : lower.includes("iaai") || lower.includes("insurance auto auctions")
      ? "IAAI"
      : "Other";

  const vinInText = raw.toUpperCase().match(/(?:^|[^A-Z0-9])([A-HJ-NPR-Z0-9]{17})(?:$|[^A-Z0-9])/);
  if (vinInText && /\d/.test(vinInText[1]) && /[A-Z]/.test(vinInText[1])) {
    return { kind: "vin", value: vinInText[1], auction };
  }

  const copart = raw.match(/copart\.[a-z.]+\/lot\/(\d{6,9})/i);
  if (copart) return { kind: "lot", value: copart[1], auction: "Copart" };

  const iaai = raw.match(/iaai\.com\/(?:VehicleDetail|vehicle-detail|vehicledetails?)\/(\d{6,10})/i)
    ?? raw.match(/iaai\.com\/.*?(?:itemid|stock(?:number)?)=(\d{6,10})/i);
  if (iaai) return { kind: "lot", value: iaai[1], auction: "IAAI" };

  const anyLot = raw.match(/(?:lot|stock)[^0-9]{0,6}(\d{6,10})/i) ?? raw.match(/\/(\d{7,10})(?:[/?#-]|$)/);
  if (anyLot) return { kind: "lot", value: anyLot[1], auction };

  const compact = raw.replace(/[\s-]/g, "").toUpperCase();
  if (VIN_RE.test(compact)) return { kind: "vin", value: compact, auction };
  if (/^\d{6,10}$/.test(compact)) return { kind: "lot", value: compact, auction };

  return { kind: "unknown", value: raw, auction };
}

export function searchLinks(q: LotQuery, car?: { year?: number; make?: string; model?: string }): SearchLink[] {
  if (q.kind === "unknown" || !q.value) return [];
  const enc = encodeURIComponent(q.value);
  const links: SearchLink[] = [];

  if (q.kind === "lot") {
    if (q.auction !== "IAAI") links.push({ label: "Copart: сторінка лота", href: `https://www.copart.com/lot/${enc}`, group: "auction" });
    if (q.auction !== "Copart") links.push({ label: "IAAI: пошук лота", href: `https://www.iaai.com/Search?Keyword=${enc}`, group: "auction" });
  } else {
    links.push({ label: "Copart: пошук за VIN", href: `https://www.copart.com/lotSearchResults?free=true&query=${enc}`, group: "auction" });
    links.push({ label: "IAAI: пошук за VIN", href: `https://www.iaai.com/Search?Keyword=${enc}`, group: "auction" });
    links.push({ label: "Carfax", href: `https://www.carfax.com/VehicleHistory/p/Report.cfx?vin=${enc}`, group: "history" });
    links.push({ label: "AutoCheck", href: `https://www.autocheck.com/vehiclehistory/?vin=${enc}`, group: "history" });
    links.push({ label: "NHTSA: відкличні кампанії", href: `https://www.nhtsa.gov/recalls?vin=${enc}`, group: "history" });
  }

  const carText = [car?.year || "", car?.make, car?.model].filter(Boolean).join(" ");
  const google = q.kind === "vin" ? `"${q.value}"` : `${q.auction === "Other" ? "" : q.auction + " "}lot ${q.value} ${carText}`.trim();
  links.push({ label: "Google: історія продажів", href: `https://www.google.com/search?q=${encodeURIComponent(google)}`, group: "web" });
  return links;
}

function quantile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo));
}

export function priceStats(prices: number[]): PriceStats | null {
  const sorted = prices.filter((p) => Number.isFinite(p) && p >= 100).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  return {
    count: sorted.length,
    medianUsd: quantile(sorted, 0.5),
    p25Usd: quantile(sorted, 0.25),
    p75Usd: quantile(sorted, 0.75),
    minUsd: sorted[0],
    maxUsd: sorted[sorted.length - 1],
  };
}

type Rec = Record<string, unknown>;

const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);

function pick(r: Rec, keys: string[]): unknown {
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

const asText = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

function asNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function newestHistory(rec: Rec): Rec {
  const history = Array.isArray(rec.history) ? rec.history.filter(isRec) : [];
  if (history.length === 0) return {};
  return [...history].sort((a, b) => String(b.sale_date ?? "").localeCompare(String(a.sale_date ?? "")))[0];
}

function engineCc(v: unknown): number {
  const s = asText(v);
  const litres = s.match(/(\d+(?:[.,]\d)?)\s*l/i);
  if (litres) return Math.round(Number(litres[1].replace(",", ".")) * 1000);
  const n = asNumber(s);
  if (n > 0 && n < 10) return Math.round(n * 1000);
  if (n >= 600 && n < 10000) return Math.round(n);
  return 0;
}

function fuel(v: unknown): FuelType | undefined {
  const s = asText(v).toLowerCase();
  if (!s) return undefined;
  if (s.includes("electric") && !s.includes("hybrid")) return "electric";
  if (s.includes("hybrid")) return "hybrid";
  if (s.includes("diesel")) return "diesel";
  if (s.includes("gas") || s.includes("petrol") || s.includes("flex")) return "petrol";
  return undefined;
}

function auctionName(v: unknown): AuctionName | undefined {
  const s = asText(v).toLowerCase();
  if (s.includes("copart")) return "Copart";
  if (s.includes("iaai") || s.includes("insurance")) return "IAAI";
  return s ? "Other" : undefined;
}

function airbags(v: unknown): LotInput["airbags"] | undefined {
  const s = asText(v).toLowerCase();
  if (!s) return undefined;
  if (s.includes("deployed") && !s.includes("not") && !s.includes("intact")) return "deployed";
  if (s.includes("intact") || s.includes("not deployed")) return "not_deployed";
  return undefined;
}

function runStatus(v: unknown): LotInput["runStatus"] | undefined {
  const s = asText(v).toLowerCase();
  if (!s) return undefined;
  if (s.includes("run") && s.includes("drive")) return "run_drive";
  if (s.includes("start")) return s.includes("not") || s.includes("won") ? "no_start" : "starts";
  if (s.includes("stationary")) return "no_start";
  return undefined;
}

export interface MappedLot {
  lot: Partial<LotInput>;
  photoUrls: string[];
  lastSale?: { date: string; status: string; priceUsd: number; auction: string };
}

export function mapProviderRecord(raw: unknown): MappedLot | null {
  const root = isRec(raw) && isRec(raw.data) ? raw.data : isRec(raw) && Array.isArray(raw.data) ? raw.data[0] : raw;
  if (!isRec(root)) return null;
  const h = newestHistory(root);
  const both = (keys: string[]) => pick(h, keys) ?? pick(root, keys);

  const lot: Partial<LotInput> = {};
  const set = <K extends keyof LotInput>(k: K, v: LotInput[K] | undefined | "" | 0) => {
    if (v !== undefined && v !== "" && v !== 0) lot[k] = v as LotInput[K];
  };

  set("vin", asText(pick(root, ["vin", "VIN"])).toUpperCase());
  set("make", asText(pick(root, ["make", "brand"])));
  set("model", [asText(pick(root, ["model"])), asText(pick(root, ["trim", "series"]))].filter(Boolean).join(" "));
  set("year", Math.round(asNumber(pick(root, ["year", "model_year"]))));
  const odo = Math.round(asNumber(both(["odometer", "mileage"])));
  if (odo > 0) {
    lot.mileage = odo;
    lot.mileageUnit = /km/i.test(asText(both(["odometer_unit", "odometer_type"]))) ? "km" : "mi";
  }
  set("engineCc", engineCc(both(["engine", "engine_size", "engine_volume", "displacement"])));
  set("fuel", fuel(both(["fuel", "fuel_type"])));
  set("auction", auctionName(both(["auction", "auction_name", "site"])));
  set("lotNumber", asText(both(["lot_number", "lot", "lot_id", "stock_number"])));
  set("primaryDamage", asText(both(["primary_damage", "damage_primary", "damage"])));
  set("secondaryDamage", asText(both(["secondary_damage", "damage_secondary"])));
  set("titleType", asText(both(["title_type", "title", "document", "doc_type"])));
  set("airbags", airbags(both(["airbags", "airbag"])));
  set("runStatus", runStatus(both(["run_status", "condition", "highlights", "start_code"])));

  const photosRaw = both(["photos", "images", "image_urls"]);
  const photoUrls = (Array.isArray(photosRaw) ? photosRaw : [])
    .map((p) => (isRec(p) ? asText(pick(p, ["url", "src", "full", "large"])) : asText(p)))
    .filter((u) => /^https:\/\//i.test(u));

  const salePrice = Math.round(asNumber(pick(h, ["final_bid", "sale_price"])));
  const lastSale = Object.keys(h).length
    ? {
        date: asText(h.sale_date),
        status: asText(h.sale_status),
        priceUsd: salePrice,
        auction: asText(h.auction),
      }
    : undefined;

  return { lot, photoUrls: [...new Set(photoUrls)], lastSale };
}

export function salePricesFrom(raw: unknown): number[] {
  const list = isRec(raw) && Array.isArray(raw.data) ? raw.data : Array.isArray(raw) ? raw : [];
  const prices: number[] = [];
  for (const item of list) {
    if (!isRec(item)) continue;
    const h = newestHistory(item);
    const status = asText(h.sale_status).toLowerCase();
    if (status && (!/sold|продан/.test(status) || /not|unsold|no sale|не продан/.test(status))) continue;
    const price = asNumber(pick(item, ["sale_price"]) ?? pick(h, ["final_bid", "sale_price"]));
    if (price > 0) prices.push(price);
  }
  return prices;
}

export interface LotLookupResponse {
  configured: boolean;
  query: LotQuery;
  links: SearchLink[];
  found: boolean;
  lot?: Partial<LotInput>;
  photos?: string[];
  lastSale?: MappedLot["lastSale"];
  comparables?: Comparables | null;
  locked?: boolean;
  credits?: number;
  message?: string;
}
