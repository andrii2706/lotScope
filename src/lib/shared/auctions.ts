import type { AuctionInfo, AuctionName, Region } from "@/types/auction";
export const AUCTIONS: Record<AuctionName, AuctionInfo> = {
  Copart: { label: "Copart США", short: "Copart", provider: "COPART", region: "us", color: "#2a6df4" },
  IAAI: { label: "IAAI США", short: "IAAI", provider: "IAAI", region: "us", color: "#d4352a" },
  CopartCanada: { label: "Copart Канада", short: "Copart CA", provider: "COPART CANADA", region: "ca", color: "#1f5bd1" },
  CopartFinland: { label: "Copart Фінляндія", short: "Copart FI", provider: "COPART FINLAND", region: "eu", color: "#1b8ea6" },
  Emirates: { label: "Emirates Auction (ОАЕ)", short: "Emirates", provider: "EMIRATES AUCTION", region: "ae", color: "#b8862b" },
  Other: { label: "Інший аукціон", short: "Інший", provider: "", region: "us", color: "#6b7280" },
};

export const AUCTION_NAMES = Object.keys(AUCTIONS) as AuctionName[];
export const SEARCHABLE: AuctionName[] = ["Copart", "IAAI", "CopartCanada", "CopartFinland", "Emirates"];

export const REGION_LABEL: Record<Region, string> = {
  us: "США",
  ca: "Канада",
  eu: "Європа",
  ae: "ОАЕ",
};

export function isAuctionName(v: unknown): v is AuctionName {
  return typeof v === "string" && (AUCTION_NAMES as string[]).includes(v);
}

export function auctionFromProvider(raw: unknown): AuctionName | undefined {
  const s = typeof raw === "string" ? raw.toLowerCase().trim() : typeof raw === "number" ? String(raw) : "";
  if (!s) return undefined;
  if (s.includes("copart")) {
    if (s.includes("canada") || /\bca\b/.test(s)) return "CopartCanada";
    if (s.includes("finland") || /\bfi\b/.test(s)) return "CopartFinland";
    return "Copart";
  }
  if (s.includes("iaai") || s.includes("insurance auto")) return "IAAI";
  if (s.includes("emirates")) return "Emirates";
  return "Other";
}

export function regionOf(auction: AuctionName | undefined): Region {
  return AUCTIONS[auction ?? "Other"]?.region ?? "us";
}

export function auctionLotUrl(auction: AuctionName, lotNumber: string): string {
  if (!lotNumber) return "";
  const enc = encodeURIComponent(lotNumber);
  switch (auction) {
    case "Copart":
      return `https://www.copart.com/lot/${enc}`;
    case "CopartCanada":
      return `https://www.copart.ca/lot/${enc}`;
    case "CopartFinland":
      return `https://www.copart.fi/en/lot/${enc}`;
    case "IAAI":
      return `https://www.iaai.com/Search?Keyword=${enc}`;
    case "Emirates":
      return `https://www.google.com/search?q=${encodeURIComponent(`Emirates Auction lot ${lotNumber}`)}`;
    default:
      return "";
  }
}

export const EU_COUNTRIES = [
  "austria", "belgium", "bulgaria", "croatia", "cyprus", "czech", "czechia", "denmark", "estonia", "finland",
  "france", "germany", "greece", "hungary", "ireland", "italy", "latvia", "lithuania", "luxembourg", "malta",
  "netherlands", "poland", "portugal", "romania", "slovakia", "slovenia", "spain", "sweden",
];

export function isEuPlant(country: string): boolean {
  const c = country.toLowerCase();
  return EU_COUNTRIES.some((e) => c.includes(e));
}
