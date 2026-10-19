import type { Comparables } from "./auction";
import type { VinHistory } from "./vinhistory";

export type FuelType = "petrol" | "diesel" | "hybrid" | "electric";
export type AirbagStatus = "not_deployed" | "deployed" | "unknown";
export type RunStatus = "run_drive" | "starts" | "no_start" | "unknown";
export type ThemeChoice = "dark" | "light" | "system";
export type HistoryMileage = "consistent" | "inconsistent" | "unknown";
export type HistoryMediaType = "application/pdf" | "image/jpeg" | "image/png" | "image/webp";

export interface LotInput {
  make: string;
  model: string;
  year: number;
  mileage: number;
  mileageUnit: "mi" | "km";
  fuel: FuelType;
  engineCc: number;
  batteryKwh: number;
  auction: "IAAI" | "Copart" | "Other";
  lotNumber: string;
  vin: string;
  primaryDamage: string;
  secondaryDamage: string;
  airbags: AirbagStatus;
  titleType: string;
  runStatus: RunStatus;
  notes: string;
  bidUsd: number;
  marketPriceUsd: number;
}

export type Verdict = "buy" | "caution" | "avoid";
export type Level = "low" | "medium" | "high";
export type PartAction = "replace" | "repair" | "paint" | "inspect";

export interface DamagedPart {
  part: string;
  action: PartAction;
  severity: "minor" | "moderate" | "severe";
  confidence: Level;
  costMinUsd: number;
  costMaxUsd: number;
  note: string;
}

export interface Scenario {
  name: string;
  description: string;
  likelihood: Level;
  repairMinUsd: number;
  repairMaxUsd: number;
}

export interface Analysis {
  summary: string;
  verdict: Verdict;
  conditionScore: number;
  impactZone: string;
  structuralRisk: Level;
  structuralRiskNote: string;
  airbagAssessment: AirbagStatus;
  airbagNote: string;
  damagedParts: DamagedPart[];
  scenarios: Scenario[];
  repairMinUsd: number;
  repairMaxUsd: number;
  redFlags: string[];
  positives: string[];
  missingViews: string[];
  inspectionChecklist: string[];
  photoNotes: { photo: number; observation: string }[];
  vinOnPhoto: string;
  odometerOnPhoto: string;
  listingConflicts: string[];
  historyProvided: boolean;
  historySummary: string;
  historyFindings: string[];
  historyMileage: HistoryMileage;
}

export interface Settings {
  companyName: string;
  companyContact: string;
  logoDataUrl: string;
  accentColor: string;
  theme: ThemeChoice;
  expertName: string;

  eurUsd: number;
  usdUah: number;

  auctionFeePct: number;
  auctionFeeFixedUsd: number;
  inlandUsUsd: number;
  oceanUsd: number;
  portUaUsd: number;
  customsBrokerUsd: number;
  deliveryUaUsd: number;
  certificationUsd: number;
  companyFeeUsd: number;
  firstServiceUsd: number;

  targetSavingsPct: number;

  laborRateUsd: number;
  paintPerPanelUsd: number;
  partsPreference: "used" | "aftermarket" | "oem";

  subsistenceMinUah: number;
}

export interface CostOverrides {
  bidUsd?: number;
  auctionFeeUsd?: number;
  inlandUsUsd?: number;
  oceanUsd?: number;
  portUaUsd?: number;
  customsBrokerUsd?: number;
  deliveryUaUsd?: number;
  certificationUsd?: number;
  companyFeeUsd?: number;
  firstServiceUsd?: number;
  repairMinUsd?: number;
  repairMaxUsd?: number;
  marketPriceUsd?: number;
}

export interface Report {
  id: string;
  createdAt: string;
  lot: LotInput;
  photos: string[];
  analysis: Analysis;
  overrides: CostOverrides;
  demo: boolean;
  model: string;
  comparables?: Comparables | null;
  historyFiles?: string[];
  vinHistory?: VinHistory | null;
  expert?: ExpertReview;
  authorId?: string;
  authorName?: string;
  saved?: boolean;
}

export interface ExpertPartReview {
  agree: boolean | null;
  costMinUsd: number;
  costMaxUsd: number;
  note: string;
}

export interface ExpertReview {
  expert: string;
  verdict: Verdict | "";
  repairMinUsd: number;
  repairMaxUsd: number;
  parts: ExpertPartReview[];
  missedParts: string;
  comment: string;
  lesson: string;
  lessonTag: string;
  useLesson: boolean;
  reviewedAt: string;
}

export interface Lesson {
  id: string;
  rule: string;
  tag: string;
  reportId: string;
  reportTitle: string;
  expert: string;
  createdAt: string;
  active: boolean;
}

export interface HistoryFile {
  name: string;
  mediaType: HistoryMediaType;
  data: string;
}

export interface AnalyzeRequest {
  lot: LotInput;
  images: { mediaType: "image/jpeg" | "image/png" | "image/webp"; data: string }[];
  pricing: Pick<Settings, "laborRateUsd" | "paintPerPanelUsd" | "partsPreference">;
  history?: HistoryFile[];
  vinHistory?: VinHistory | null;
}

export interface AnalyzeResponse {
  analysis: Analysis;
  demo: boolean;
  model: string;
}
