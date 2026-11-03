import { tableAuctionFee } from "./auctionFees.ts";
import { AUCTIONS, regionOf } from "./auctions.ts";
import type { CostGroup, CostResult } from "@/types/pricing";
import type { Region } from "@/types/auction";
import type { CostOverrides, LotInput, Settings } from "@/types/report";

const round = (n: number) => Math.round(n);
const num = (v: unknown, fallback = 0) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

export function ageCoefficient(year: number, now = new Date()): number {
  const raw = now.getFullYear() - year - 1;
  return Math.min(15, Math.max(1, raw));
}

export function exciseBaseRate(lot: LotInput): number {
  if (lot.fuel === "electric") return 1;
  if (lot.fuel === "diesel") return lot.engineCc > 3500 ? 150 : 75;
  return lot.engineCc > 3000 ? 100 : 50;
}

export function exciseEur(lot: LotInput, now = new Date()): number {
  if (lot.fuel === "electric") return Math.max(0, lot.batteryKwh);
  const liters = Math.max(0, lot.engineCc) / 1000;
  return exciseBaseRate(lot) * liters * ageCoefficient(lot.year, now);
}

export function pensionPct(lot: LotInput, baseUsd: number, s: Settings): number {
  if (lot.fuel === "electric") return 0;
  const baseUah = baseUsd * s.usdUah;
  if (baseUah <= 165 * s.subsistenceMinUah) return 3;
  if (baseUah <= 290 * s.subsistenceMinUah) return 4;
  return 5;
}

const GRID_AUCTIONS: LotInput["auction"][] = ["Copart", "IAAI", "Other"];

export function estimateAuctionFee(bidUsd: number, s: Settings, auction: LotInput["auction"] = "Copart"): number {
  if (bidUsd <= 0) return 0;
  if (s.auctionFeeMode === "table" && GRID_AUCTIONS.includes(auction)) return tableAuctionFee(bidUsd, auction).total;
  return round((bidUsd * s.auctionFeePct) / 100 + s.auctionFeeFixedUsd);
}

function auctionFeeHint(bidUsd: number, s: Settings, auction: LotInput["auction"]): string {
  if (s.auctionFeeMode === "table" && GRID_AUCTIONS.includes(auction)) return `${tableAuctionFee(bidUsd, auction).hint}, орієнтовно`;
  if (s.auctionFeeMode === "table") return `${AUCTIONS[auction]?.short ?? "Аукціон"}: сітка не опублікована, ваш відсоток ${s.auctionFeePct} % + ${s.auctionFeeFixedUsd} $`;
  return `оцінка: ${s.auctionFeePct} % + ${s.auctionFeeFixedUsd} $`;
}

interface Resolved {
  bid: number;
  auctionFee: number;
  inlandUs: number;
  ocean: number;
  portUa: number;
  broker: number;
  deliveryUa: number;
  certification: number;
  companyFee: number;
  firstService: number;
}

export const REGION_LINES: Record<Region, { group: string; inland: string; ocean: string; portUa: string }> = {
  us: { group: "Купівля в США", inland: "Доставка до порту в США", ocean: "Морська доставка", portUa: "Порт і експедирування" },
  ca: { group: "Купівля в Канаді", inland: "Доставка до порту в Канаді", ocean: "Морська доставка з Канади", portUa: "Порт і експедирування" },
  eu: { group: "Купівля в ЄС", inland: "Доставка з майданчика аукціону", ocean: "Автовоз до кордону України", portUa: "Експортне оформлення в ЄС" },
  ae: { group: "Купівля в ОАЕ", inland: "Доставка до порту Джебель-Алі", ocean: "Морська доставка з ОАЕ", portUa: "Порт і експедирування" },
};

export function regionalRates(region: Region, s: Settings) {
  switch (region) {
    case "ca":
      return { inland: s.caInlandUsd, ocean: s.caOceanUsd, port: s.caPortUsd, delivery: s.caDeliveryUsd };
    case "eu":
      return { inland: s.euInlandUsd, ocean: s.euOceanUsd, port: s.euPortUsd, delivery: s.euDeliveryUsd };
    case "ae":
      return { inland: s.aeInlandUsd, ocean: s.aeOceanUsd, port: s.aePortUsd, delivery: s.aeDeliveryUsd };
    default:
      return { inland: s.inlandUsUsd, ocean: s.oceanUsd, port: s.portUaUsd, delivery: s.deliveryUaUsd };
  }
}

export function dutyFree(lot: LotInput): boolean {
  return lot.fuel === "electric" || (regionOf(lot.auction) === "eu" && lot.eur1 === true);
}

function resolve(lot: LotInput, s: Settings, o: CostOverrides, bidOverride?: number): Resolved {
  const bid = bidOverride ?? num(o.bidUsd, lot.bidUsd);
  const rates = regionalRates(regionOf(lot.auction), s);
  return {
    bid,
    auctionFee:
      bidOverride === undefined && o.auctionFeeUsd !== undefined
        ? num(o.auctionFeeUsd)
        : estimateAuctionFee(bid, s, lot.auction),
    inlandUs: num(o.inlandUsUsd, rates.inland),
    ocean: num(o.oceanUsd, rates.ocean),
    portUa: num(o.portUaUsd, rates.port),
    broker: num(o.customsBrokerUsd, s.customsBrokerUsd),
    deliveryUa: num(o.deliveryUaUsd, rates.delivery),
    certification: num(o.certificationUsd, s.certificationUsd),
    companyFee: num(o.companyFeeUsd, s.companyFeeUsd),
    firstService: num(o.firstServiceUsd, s.firstServiceUsd),
  };
}

function customs(lot: LotInput, s: Settings, r: Resolved, now: Date) {
  const customsValue = r.bid + r.auctionFee + r.inlandUs + r.ocean;
  const duty = dutyFree(lot) ? 0 : customsValue * 0.1;
  const excEur = exciseEur(lot, now);
  const excise = excEur * s.eurUsd;
  const vat = (customsValue + duty + excise) * 0.2;
  const pPct = pensionPct(lot, customsValue, s);
  const pension = (customsValue * pPct) / 100;
  return { customsValue, duty, excEur, excise, vat, pPct, pension };
}

function baseTotal(lot: LotInput, s: Settings, o: CostOverrides, now: Date, bid?: number) {
  const r = resolve(lot, s, o, bid);
  const c = customs(lot, s, r, now);
  return (
    c.customsValue +
    c.duty +
    c.excise +
    c.vat +
    c.pension +
    r.portUa +
    r.broker +
    r.deliveryUa +
    r.certification +
    r.companyFee +
    r.firstService
  );
}

export function calculate(
  lot: LotInput,
  settings: Settings,
  overrides: CostOverrides,
  repair: { min: number; max: number },
  now = new Date(),
): CostResult {
  const r = resolve(lot, settings, overrides);
  const c = customs(lot, settings, r, now);
  const age = ageCoefficient(lot.year, now);
  const lines = REGION_LINES[regionOf(lot.auction)];

  const repairMin = Math.max(0, num(overrides.repairMinUsd, repair.min));
  const repairMax = Math.max(repairMin, num(overrides.repairMaxUsd, repair.max));
  const repairMid = (repairMin + repairMax) / 2;

  const exciseHint =
    lot.fuel === "electric"
      ? `1 € × ${lot.batteryKwh} кВт·год = ${round(c.excEur)} €`
      : `${exciseBaseRate(lot)} € × ${(lot.engineCc / 1000).toFixed(1)} л × вік ${age} = ${round(c.excEur)} €`;

  const groups: CostGroup[] = [
    {
      title: lines.group,
      lines: [
        { key: "bid", label: "Ставка на аукціоні", usd: r.bid, editable: "bidUsd" },
        {
          key: "auctionFee",
          label: "Збір аукціону",
          usd: r.auctionFee,
          hint: overrides.auctionFeeUsd !== undefined ? "змінено вручну" : auctionFeeHint(r.bid, settings, lot.auction),
          editable: "auctionFeeUsd",
        },
        { key: "inlandUs", label: lines.inland, usd: r.inlandUs, editable: "inlandUsUsd" },
        { key: "ocean", label: lines.ocean, usd: r.ocean, editable: "oceanUsd" },
      ],
      subtotal: 0,
    },
    {
      title: "Розмитнення",
      lines: [
        {
          key: "duty",
          label: "Мито",
          usd: c.duty,
          hint:
            lot.fuel === "electric"
              ? "електромобіль — 0 %"
              : dutyFree(lot)
                ? "0 %: походження ЄС, сертифікат EUR.1"
              : `10 % від митної вартості ${round(c.customsValue).toLocaleString("uk-UA")} $`,
        },
        { key: "excise", label: "Акциз", usd: c.excise, hint: exciseHint },
        { key: "vat", label: "ПДВ", usd: c.vat, hint: "20 % від митної вартості, мита й акцизу" },
      ],
      subtotal: 0,
    },
    {
      title: "Україна",
      lines: [
        { key: "portUa", label: lines.portUa, usd: r.portUa, editable: "portUaUsd" },
        { key: "broker", label: "Митний брокер", usd: r.broker, editable: "customsBrokerUsd" },
        { key: "deliveryUa", label: "Доставка по Україні", usd: r.deliveryUa, editable: "deliveryUaUsd" },
        {
          key: "certification",
          label: "Сертифікація та реєстрація",
          usd: r.certification,
          editable: "certificationUsd",
        },
        {
          key: "pension",
          label: "Пенсійний збір",
          usd: c.pension,
          hint:
            lot.fuel === "electric"
              ? "електромобілі звільнені"
              : `${c.pPct} % від вартості авто без ПДВ`,
        },
        { key: "companyFee", label: "Послуги компанії", usd: r.companyFee, editable: "companyFeeUsd" },
      ],
      subtotal: 0,
    },
    {
      title: "Після купівлі",
      lines: [
        {
          key: "repair",
          label: "Ремонт (середня оцінка)",
          usd: repairMid,
          hint: `вилка ${round(repairMin).toLocaleString("uk-UA")}–${round(repairMax).toLocaleString("uk-UA")} $`,
        },
        { key: "firstService", label: "Перше ТО", usd: r.firstService, editable: "firstServiceUsd" },
      ],
      subtotal: 0,
    },
  ];

  for (const g of groups) {
    g.lines = g.lines.map((l) => ({ ...l, usd: round(l.usd) }));
    g.subtotal = g.lines.reduce((sum, l) => sum + l.usd, 0);
  }

  const base = baseTotal(lot, settings, overrides, now);
  const totalMin = round(base + repairMin);
  const totalMax = round(base + repairMax);
  const totalMid = round(base + repairMid);

  const market = Math.max(0, num(overrides.marketPriceUsd, lot.marketPriceUsd));
  const savings = market > 0 ? market - totalMid : 0;
  const savingsPct = market > 0 ? (savings / market) * 100 : 0;

  let maxBid: number | null = null;
  if (market > 0) {
    const budget = market * (1 - settings.targetSavingsPct / 100) - repairMax;
    if (baseTotal(lot, settings, overrides, now, 0) <= budget) {
      let lo = 0;
      let hi = market;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (baseTotal(lot, settings, overrides, now, mid) <= budget) lo = mid;
        else hi = mid;
      }
      maxBid = Math.floor(lo / 25) * 25;
    } else {
      maxBid = 0;
    }
  }

  return {
    groups,
    customsValueUsd: round(c.customsValue),
    ageCoefficient: age,
    exciseEur: round(c.excEur),
    pensionPct: c.pPct,
    repairMinUsd: round(repairMin),
    repairMaxUsd: round(repairMax),
    baseUsd: round(base),
    totalMinUsd: totalMin,
    totalMaxUsd: totalMax,
    totalMidUsd: totalMid,
    marketPriceUsd: round(market),
    savingsUsd: round(savings),
    savingsPct,
    maxBidUsd: maxBid,
  };
}

export const usd = (n: number) => `${Math.round(n).toLocaleString("uk-UA")} $`;
