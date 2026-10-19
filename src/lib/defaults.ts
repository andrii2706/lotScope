import type { LotInput, Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  companyName: "",
  companyContact: "",
  logoDataUrl: "",
  accentColor: "#c8f542",
  theme: "dark",
  expertName: "",

  eurUsd: 1.16,
  usdUah: 42,

  auctionFeePct: 10,
  auctionFeeFixedUsd: 350,
  inlandUsUsd: 450,
  oceanUsd: 1400,
  portUaUsd: 400,
  customsBrokerUsd: 300,
  deliveryUaUsd: 250,
  certificationUsd: 250,
  companyFeeUsd: 600,
  firstServiceUsd: 400,

  targetSavingsPct: 15,

  laborRateUsd: 15,
  paintPerPanelUsd: 200,
  partsPreference: "used",

  subsistenceMinUah: 3328,
};

export const EMPTY_LOT: LotInput = {
  make: "",
  model: "",
  year: new Date().getFullYear() - 5,
  mileage: 0,
  mileageUnit: "mi",
  fuel: "petrol",
  engineCc: 2000,
  batteryKwh: 75,
  auction: "IAAI",
  lotNumber: "",
  vin: "",
  primaryDamage: "",
  secondaryDamage: "",
  airbags: "unknown",
  titleType: "",
  runStatus: "unknown",
  notes: "",
  bidUsd: 0,
  marketPriceUsd: 0,
};

export const MAX_PHOTOS = 12;
