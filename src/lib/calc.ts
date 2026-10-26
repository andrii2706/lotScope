import type { CostOverrides, LotInput, Settings } from "./types";

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

export function estimateAuctionFee(bidUsd: number, s: Settings): number {
  if (bidUsd <= 0) return 0;
  return round((bidUsd * s.auctionFeePct) / 100 + s.auctionFeeFixedUsd);
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

function resolve(lot: LotInput, s: Settings, o: CostOverrides, bidOverride?: number): Resolved {
  const bid = bidOverride ?? num(o.bidUsd, lot.bidUsd);
  return {
    bid,
    auctionFee:
      bidOverride === undefined && o.auctionFeeUsd !== undefined
        ? num(o.auctionFeeUsd)
        : estimateAuctionFee(bid, s),
    inlandUs: num(o.inlandUsUsd, s.inlandUsUsd),
    ocean: num(o.oceanUsd, s.oceanUsd),
    portUa: num(o.portUaUsd, s.portUaUsd),
    broker: num(o.customsBrokerUsd, s.customsBrokerUsd),
    deliveryUa: num(o.deliveryUaUsd, s.deliveryUaUsd),
    certification: num(o.certificationUsd, s.certificationUsd),
    companyFee: num(o.companyFeeUsd, s.companyFeeUsd),
    firstService: num(o.firstServiceUsd, s.firstServiceUsd),
  };
}

function customs(lot: LotInput, s: Settings, r: Resolved, now: Date) {
  const customsValue = r.bid + r.auctionFee + r.inlandUs + r.ocean;
  const duty = lot.fuel === "electric" ? 0 : customsValue * 0.1;
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

  const repairMin = Math.max(0, num(overrides.repairMinUsd, repair.min));
  const repairMax = Math.max(repairMin, num(overrides.repairMaxUsd, repair.max));
  const repairMid = (repairMin + repairMax) / 2;

  const exciseHint =
    lot.fuel === "electric"
      ? `1 € × ${lot.batteryKwh} кВт·год = ${round(c.excEur)} €`
      : `${exciseBaseRate(lot)} € × ${(lot.engineCc / 1000).toFixed(1)} л × вік ${age} = ${round(c.excEur)} €`;

  const groups: CostGroup[] = [
    {
      title: "Купівля в США",
      lines: [
        { key: "bid", label: "Ставка на аукціоні", usd: r.bid, editable: "bidUsd" },
        {
          key: "auctionFee",
          label: "Збір аукціону",
          usd: r.auctionFee,
          hint: `оцінка: ${settings.auctionFeePct} % + ${settings.auctionFeeFixedUsd} $`,
          editable: "auctionFeeUsd",
        },
        { key: "inlandUs", label: "Доставка до порту в США", usd: r.inlandUs, editable: "inlandUsUsd" },
        { key: "ocean", label: "Морська доставка", usd: r.ocean, editable: "oceanUsd" },
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
        { key: "portUa", label: "Порт і експедирування", usd: r.portUa, editable: "portUaUsd" },
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
