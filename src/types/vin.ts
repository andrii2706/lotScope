import type { OutboundLink } from "@/types/ui";

export interface VinMismatch {
  position: number;
  listing: string;
  photo: string;
}

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
  links: OutboundLink[];
  message?: string;
}

export type VinHistoryState =
  | { status: "idle" }
  | { status: "loading"; vin: string }
  | { status: "done"; vin: string; response: VinHistoryResponse }
  | { status: "error"; vin: string; message: string };
