import type { FuelType, LotInput } from "@/types/report";
import type { OutboundLink } from "@/types/ui";

export interface LotQuery {
  kind: "vin" | "lot" | "unknown";
  value: string;
  auction: AuctionName;
}

export interface SearchLink extends OutboundLink {
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

export interface MappedLot {
  lot: Partial<LotInput>;
  photoUrls: string[];
  lastSale?: { date: string; status: string; priceUsd: number; auction: string };
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
  message?: string;
}

export type AuctionName = "Copart" | "IAAI" | "CopartCanada" | "CopartFinland" | "Emirates" | "Other";

export type Region = "us" | "ca" | "eu" | "ae";

export interface AuctionInfo {
  label: string;
  short: string;
  provider: string;
  region: Region;
  color: string;
}

export interface AuctionFeeBreakdown {
  total: number;
  hint: string;
}

export interface SearchFilters {
  make: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  maxMiles: number;
  maxBidUsd: number;
  auction: "all" | AuctionName;
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
  links: OutboundLink[];
  message?: string;
  page?: number;
  totalPages?: number;
  providerTotal?: number;
  loose?: boolean;
}

export interface VinDecoded {
  make: string;
  model: string;
  year: number;
  engineCc: number;
  fuel?: FuelType;
  plantCountry: string;
  plantCity: string;
  bodyClass: string;
  driveType: string;
}
