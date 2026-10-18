export interface AuctionSale {
  date: string;
  auction: string;
  lotNumber: string;
  status: string;
  priceUsd: number;
  odometer: number;
  damage: string;
  titleType: string;
  location: string;
}

export interface TitleRecord {
  date: string;
  state: string;
  odometer: number;
  unit: "mi" | "km";
}

export interface BrandRecord {
  date: string;
  name: string;
  source: string;
}

export interface VinHistory {
  vin: string;
  sources: string[];
  auctionSales: AuctionSale[];
  titleRecords: TitleRecord[];
  brands: BrandRecord[];
  fetchedAt: string;
}

export interface VinHistoryResponse {
  configured: boolean;
  history: VinHistory | null;
  links: { label: string; href: string }[];
  locked?: boolean;
  credits?: number;
  message?: string;
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max = 120) =>
  (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "").slice(0, max);
function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
const byDate = <T extends { date: string }>(a: T, b: T) => a.date.localeCompare(b.date);

export function mapAuctionHistory(raw: unknown): AuctionSale[] {
  const root = isRec(raw) && isRec(raw.data) ? raw.data : isRec(raw) && Array.isArray(raw.data) ? raw.data[0] : raw;
  if (!isRec(root) || !Array.isArray(root.history)) return [];
  return root.history
    .filter(isRec)
    .map((h) => ({
      date: text(h.sale_date ?? h.auction_date, 30),
      auction: text(h.auction, 30),
      lotNumber: text(h.lot_number, 30),
      status: text(h.sale_status, 40),
      priceUsd: Math.round(num(h.final_bid ?? h.sale_price)),
      odometer: Math.round(num(h.odometer)),
      damage: [text(h.primary_damage, 60), text(h.secondary_damage, 60)].filter(Boolean).join(" / "),
      titleType: text(h.title_type, 60),
      location: text(h.location, 80),
    }))
    .sort(byDate)
    .slice(-20);
}

export function mapVinAudit(raw: unknown): { titleRecords: TitleRecord[]; brands: BrandRecord[] } {
  if (!isRec(raw)) return { titleRecords: [], brands: [] };
  const list = (v: unknown) => (Array.isArray(v) ? v.filter(isRec) : []);
  const titleRecords = list(raw.titles)
    .map((t) => ({
      date: text(t.date, 30),
      state: text(t.state ?? t.datestate, 30),
      odometer: Math.round(num(t.meter)),
      unit: (text(t.meterUnit, 4).toUpperCase() === "K" ? "km" : "mi") as "mi" | "km",
    }))
    .sort(byDate)
    .slice(-30);
  const brands = [
    ...list(raw.checks).map((c) => ({
      date: text(c.date, 30),
      name: [text(c.brandCode, 20), text(c.disposition ?? c.namedisposition, 80)].filter(Boolean).join(" · ") || "Title brand",
      source: text(c.branderName, 80) || "NMVTIS",
    })),
    ...list(raw.jsi).map((j) => ({
      date: text(j.date, 30),
      name: [text(j.recordType, 60), text(j.vehicleDisposition, 60)].filter(Boolean).join(" · ") || "Junk/salvage/insurance",
      source: [text(j.branderName, 80), text(j.branderState, 10)].filter(Boolean).join(", ") || "NMVTIS",
    })),
  ]
    .sort(byDate)
    .slice(-30);
  return { titleRecords, brands };
}

export function odometerReadings(h: VinHistory): { date: string; miles: number; source: string }[] {
  const readings = [
    ...h.auctionSales.filter((s) => s.odometer > 0).map((s) => ({ date: s.date, miles: s.odometer, source: s.auction || "аукціон" })),
    ...h.titleRecords
      .filter((t) => t.odometer > 0)
      .map((t) => ({ date: t.date, miles: t.unit === "km" ? Math.round(t.odometer / 1.609) : t.odometer, source: `титул ${t.state}`.trim() })),
  ];
  return readings.filter((r) => r.date).sort((a, b) => a.date.localeCompare(b.date));
}

export function mileageIssues(h: VinHistory): string[] {
  const readings = odometerReadings(h);
  const issues: string[] = [];
  for (let i = 1; i < readings.length; i++) {
    const prev = readings[i - 1];
    const cur = readings[i];
    if (cur.miles < prev.miles - 500) {
      issues.push(
        `Пробіг в історії зменшився: ${prev.miles.toLocaleString("uk-UA")} mi (${prev.date.slice(0, 10)}, ${prev.source}) → ${cur.miles.toLocaleString("uk-UA")} mi (${cur.date.slice(0, 10)}, ${cur.source}). Можливе скручування.`,
      );
    }
  }
  return issues;
}

export function previousAuctionFlags(h: VinHistory, currentLot: string): string[] {
  const earlier = h.auctionSales.filter((s) => s.lotNumber && s.lotNumber !== currentLot);
  if (earlier.length === 0) return [];
  const sold = earlier.filter((s) => /sold/i.test(s.status) && !/not/i.test(s.status));
  const list = earlier
    .slice(-3)
    .map((s) => `${s.date.slice(0, 10)} ${s.auction} ${s.damage || ""}`.trim())
    .join("; ");
  return [`Авто вже виставлялося на аукціон ${earlier.length} раз(и)${sold.length ? `, продавалося ${sold.length}` : ""}: ${list}.`];
}

export function historyToText(h: VinHistory): string {
  const lines: string[] = [`VIN: ${h.vin}`, `Sources: ${h.sources.join(", ") || "none"}`];
  if (h.auctionSales.length) {
    lines.push("Auction appearances (oldest first):");
    for (const s of h.auctionSales) {
      lines.push(
        `- ${s.date || "date unknown"}, ${s.auction || "auction"} lot ${s.lotNumber || "?"}, status ${s.status || "unknown"}${s.priceUsd ? `, final bid ${s.priceUsd} USD` : ""}${s.odometer ? `, odometer ${s.odometer} mi` : ""}${s.damage ? `, damage ${s.damage}` : ""}${s.titleType ? `, title ${s.titleType}` : ""}${s.location ? `, ${s.location}` : ""}`,
      );
    }
  }
  if (h.titleRecords.length) {
    lines.push("Title records (NMVTIS, oldest first):");
    for (const t of h.titleRecords) lines.push(`- ${t.date || "date unknown"}, ${t.state || "state unknown"}${t.odometer ? `, odometer ${t.odometer} ${t.unit}` : ""}`);
  }
  if (h.brands.length) {
    lines.push("Title brands and junk/salvage/insurance records:");
    for (const b of h.brands) lines.push(`- ${b.date || "date unknown"}: ${b.name} (${b.source})`);
  }
  if (!h.auctionSales.length && !h.titleRecords.length && !h.brands.length) lines.push("No records were found.");
  return lines.join("\n");
}

export function sanitizeHistory(raw: unknown): VinHistory | null {
  if (!isRec(raw)) return null;
  const vin = text(raw.vin, 17).toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return null;
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter(isRec) : []);
  return {
    vin,
    sources: (Array.isArray(raw.sources) ? raw.sources : []).map((s) => text(s, 40)).filter(Boolean).slice(0, 5),
    auctionSales: arr(raw.auctionSales).slice(-20).map((s) => ({
      date: text(s.date, 30),
      auction: text(s.auction, 30),
      lotNumber: text(s.lotNumber, 30),
      status: text(s.status, 40),
      priceUsd: Math.max(0, Math.round(num(s.priceUsd))),
      odometer: Math.max(0, Math.round(num(s.odometer))),
      damage: text(s.damage, 120),
      titleType: text(s.titleType, 60),
      location: text(s.location, 80),
    })),
    titleRecords: arr(raw.titleRecords).slice(-30).map((t) => ({
      date: text(t.date, 30),
      state: text(t.state, 30),
      odometer: Math.max(0, Math.round(num(t.odometer))),
      unit: t.unit === "km" ? "km" : "mi",
    })),
    brands: arr(raw.brands).slice(-30).map((b) => ({ date: text(b.date, 30), name: text(b.name, 120), source: text(b.source, 80) })),
    fetchedAt: text(raw.fetchedAt, 40),
  };
}
