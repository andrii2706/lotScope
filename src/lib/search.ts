import { type AuctionName, type PriceStats, newestHistory, priceStats, salePricesFrom } from "./auction.ts";

export interface SearchFilters {
  make: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  maxMiles: number;
  maxBidUsd: number;
  auction: "all" | "Copart" | "IAAI";
  damages: string[];
  excludeFlood: boolean;
  excludeDeployed: boolean;
  runDriveOnly: boolean;
}

export interface ActiveLot {
  auction: AuctionName;
  lotNumber: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  primaryDamage: string;
  secondaryDamage: string;
  titleType: string;
  runStatus: string;
  airbags: string;
  odometer: number;
  location: string;
  auctionDate: string;
  currentBidUsd: number;
  buyNowUsd: number;
  photo: string;
  url: string;
}

export interface SearchResponse {
  configured: boolean;
  lots: ActiveLot[];
  total: number;
  comparables: PriceStats | null;
  links: { label: string; href: string }[];
  message?: string;
}

export const DAMAGE_FILTERS = [
  "Front End",
  "Rear End",
  "Side",
  "Left Side",
  "Right Side",
  "Minor Dent/Scratches",
  "Hail",
  "Mechanical",
  "Undercarriage",
];

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
function pick(r: Rec, keys: string[]): unknown {
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

export function lotUrl(auction: AuctionName, lotNumber: string): string {
  if (!lotNumber) return "";
  const enc = encodeURIComponent(lotNumber);
  return auction === "Copart"
    ? `https://www.copart.com/lot/${enc}`
    : `https://www.iaai.com/Search?Keyword=${enc}`;
}

function flatten(r: Rec): Rec {
  const out: Rec = { ...r };
  for (const [key, value] of Object.entries(r)) {
    if (key === "history" || !isRec(value)) continue;
    for (const [k, v] of Object.entries(value)) if (!(k in out) && !isRec(v)) out[k] = v;
  }
  return out;
}

export function mapActiveLot(input: unknown): ActiveLot | null {
  if (!isRec(input)) return null;
  const raw = flatten(input);
  const h = flatten(newestHistory(input));
  const both = (keys: string[]) => pick(h, keys) ?? pick(raw, keys);
  const auctionRaw = text(both(["auction", "auction_name", "site"])).toLowerCase();
  const auction: AuctionName = auctionRaw.includes("copart") ? "Copart" : auctionRaw.includes("iaai") ? "IAAI" : "Other";
  const lotNumber = text(both(["lot_number", "lot", "lot_id", "stock_number"]));
  const make = text(pick(raw, ["make", "brand"]));
  const model = text(pick(raw, ["model"]));
  const year = Math.round(num(pick(raw, ["year", "model_year"])));
  if (!make && !lotNumber) return null;
  const photos = both(["photos", "images", "image_urls"]);
  const first = Array.isArray(photos) ? photos[0] : undefined;
  const photo = isRec(first) ? text(pick(first, ["url", "src", "thumb", "full"])) : text(first);
  return {
    auction,
    lotNumber,
    vin: text(pick(raw, ["vin", "VIN"])).toUpperCase(),
    year,
    make,
    model: [model, text(pick(raw, ["trim", "series"]))].filter(Boolean).join(" "),
    primaryDamage: text(both(["primary_damage", "damage_primary", "damage"])),
    secondaryDamage: text(both(["secondary_damage", "damage_secondary"])),
    titleType: text(both(["title_type", "title", "document", "doc_type"])),
    runStatus: text(both(["run_status", "condition", "highlights", "start_code"])),
    airbags: text(both(["airbags", "airbag"])),
    odometer: Math.round(num(both(["odometer", "mileage"]))),
    location: text(both(["location", "yard", "yard_name", "state"])),
    auctionDate: text(both(["auction_date", "sale_date", "date"])),
    currentBidUsd: Math.round(num(both(["current_bid", "bid"]))),
    buyNowUsd: Math.round(num(both(["buy_now", "buy_it_now"]))),
    photo: /^https:\/\//i.test(photo) ? photo : "",
    url: lotUrl(auction, lotNumber),
  };
}

function isSold(raw: unknown): boolean {
  if (!isRec(raw)) return false;
  const status = text(newestHistory(raw).sale_status).toLowerCase();
  return /sold|продан/.test(status) && !/not|unsold|no sale|не продан/.test(status);
}

export function filterLots(lots: ActiveLot[], f: SearchFilters): ActiveLot[] {
  const damages = f.damages.map((d) => d.toLowerCase());
  return lots.filter((l) => {
    if (f.auction !== "all" && l.auction !== f.auction) return false;
    if (f.yearFrom && l.year && l.year < f.yearFrom) return false;
    if (f.yearTo && l.year && l.year > f.yearTo) return false;
    if (f.maxMiles && l.odometer > f.maxMiles) return false;
    if (f.maxBidUsd && l.currentBidUsd > f.maxBidUsd) return false;
    const damage = `${l.primaryDamage} ${l.secondaryDamage}`.toLowerCase();
    if (damages.length && !damages.some((d) => damage.includes(d))) return false;
    if (f.excludeFlood && /water|flood/.test(damage)) return false;
    if (f.excludeDeployed && /deployed/i.test(l.airbags) && !/not|intact/i.test(l.airbags)) return false;
    if (f.runDriveOnly && !/run/i.test(l.runStatus)) return false;
    return true;
  });
}

export function listFrom(raw: unknown): unknown[] {
  return isRec(raw) && Array.isArray(raw.result) ? raw.result : isRec(raw) && Array.isArray(raw.data) ? raw.data : Array.isArray(raw) ? raw : [];
}

export function sampleKeys(raw: unknown): string {
  const first = listFrom(raw)[0];
  return isRec(first) ? Object.keys(first).slice(0, 40).join(", ") : "";
}

export function activeFrom(raw: unknown): ActiveLot[] {
  const out: ActiveLot[] = [];
  for (const item of listFrom(raw)) {
    if (isSold(item)) continue;
    const lot = mapActiveLot(item);
    if (lot) out.push(lot);
  }
  return out.sort((a, b) => (Date.parse(a.auctionDate) || Infinity) - (Date.parse(b.auctionDate) || Infinity));
}

export function splitResults(raw: unknown, now = Date.now()): { active: ActiveLot[]; comparables: PriceStats | null } {
  const list = isRec(raw) && Array.isArray(raw.result) ? raw.result : isRec(raw) && Array.isArray(raw.data) ? raw.data : Array.isArray(raw) ? raw : [];
  const active: ActiveLot[] = [];
  for (const item of list) {
    if (isSold(item)) continue;
    const lot = mapActiveLot(item);
    if (!lot) continue;
    const when = Date.parse(lot.auctionDate);
    if (Number.isFinite(when) && when < now - 6 * 3600_000) continue;
    active.push(lot);
  }
  active.sort((a, b) => (Date.parse(a.auctionDate) || Infinity) - (Date.parse(b.auctionDate) || Infinity));
  return { active, comparables: priceStats(salePricesFrom(raw)) };
}

export function auctionSearchLinks(f: Pick<SearchFilters, "make" | "model" | "auction">) {
  const q = encodeURIComponent([f.make, f.model].filter(Boolean).join(" "));
  const links: { label: string; href: string }[] = [];
  if (!q) return links;
  if (f.auction !== "IAAI") links.push({ label: "Шукати на Copart", href: `https://www.copart.com/lotSearchResults?free=true&query=${q}` });
  if (f.auction !== "Copart") links.push({ label: "Шукати на IAAI", href: `https://www.iaai.com/Search?Keyword=${q}` });
  return links;
}
