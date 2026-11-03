import type { CostOverrides } from "@/types/report";

export interface CostLine {
  key: string;
  label: string;
  usd: number;
  hint?: string;
  editable?: keyof CostOverrides;
}

export interface CostGroup {
  title: string;
  lines: CostLine[];
  subtotal: number;
}

export interface CostResult {
  groups: CostGroup[];
  customsValueUsd: number;
  ageCoefficient: number;
  exciseEur: number;
  pensionPct: number;
  repairMinUsd: number;
  repairMaxUsd: number;
  baseUsd: number;
  totalMinUsd: number;
  totalMaxUsd: number;
  totalMidUsd: number;
  marketPriceUsd: number;
  savingsUsd: number;
  savingsPct: number;
  maxBidUsd: number | null;
}

export interface Rates {
  usdUah: number;
  eurUah: number;
  plnUah: number;
  date: string;
  source: string;
}

export type PartSource = "Allegro" | "OLX";

export type PartCurrency = "PLN" | "UAH" | "USD" | "EUR";

export interface PartOffer {
  source: PartSource;
  title: string;
  price: number;
  currency: PartCurrency;
  url: string;
  condition: "used" | "new" | "unknown";
}

export interface PartPrice {
  part: string;
  offers: PartOffer[];
  laborHoursMin: number;
  laborHoursMax: number;
  paint: boolean;
  note: string;
}

export interface PartsSearch {
  checkedAt: string;
  model: string;
  parts: PartPrice[];
}

export interface PartRange {
  part: string;
  found: boolean;
  partMinUsd: number;
  partMaxUsd: number;
  minUsd: number;
  maxUsd: number;
}

export interface MarketResponse {
  configured: boolean;
  found: boolean;
  stats?: MarketStats;
  message?: string;
}

export interface MarketStats {
  query: string;
  total: number;
  used: number;
  medianUsd: number;
  p25Usd: number;
  p75Usd: number;
  links: string[];
  checkedAt: string;
}
