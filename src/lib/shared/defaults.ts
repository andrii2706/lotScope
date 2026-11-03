import type { LotInput, Settings } from "@/types/report";

export const DEFAULT_SETTINGS: Settings = {
  companyName: "",
  companyContact: "",
  logoDataUrl: "",
  accentColor: "#2b59ff",
  theme: "light",
  expertName: "",

  eurUsd: 1.16,
  usdUah: 42,
  plnUsd: 0.27,
  autoRates: true,

  auctionFeeMode: "table",
  auctionFeePct: 10,
  auctionFeeFixedUsd: 350,
  inlandUsUsd: 650,
  oceanUsd: 1350,
  portUaUsd: 500,
  customsBrokerUsd: 200,
  deliveryUaUsd: 800,
  certificationUsd: 250,
  companyFeeUsd: 600,
  firstServiceUsd: 400,

  caInlandUsd: 500,
  caOceanUsd: 1900,
  caPortUsd: 300,
  caDeliveryUsd: 300,
  euInlandUsd: 150,
  euOceanUsd: 1000,
  euPortUsd: 150,
  euDeliveryUsd: 200,
  aeInlandUsd: 150,
  aeOceanUsd: 1800,
  aePortUsd: 400,
  aeDeliveryUsd: 300,

  targetSavingsPct: 15,

  laborRateUsd: 15,
  paintPerPanelUsd: 200,
  partsDeliveryPlUsd: 40,
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
