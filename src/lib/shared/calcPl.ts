import { estimateAuctionFee, regionalRates } from "./calc.ts";
import { regionOf } from "./auctions.ts";
import type { CostGroup, CostResult } from "@/types/pricing";
import type { Region } from "@/types/auction";
import type { CostOverrides, LotInput, Settings } from "@/types/report";

const round = (n: number) => Math.round(n);
const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const pln = (n: number) => `${Math.round(n).toLocaleString("pl-PL")} zł`;
const pct = (n: number) => `${n.toLocaleString("pl-PL")} %`;

export const PL_VAT: Record<Settings["plClearance"], { pct: number; label: string }> = {
  pl: { pct: 23, label: "odprawa w Polsce" },
  de: { pct: 19, label: "odprawa w Niemczech" },
  nl: { pct: 21, label: "odprawa w Holandii" },
};

export function akcyzaPct(lot: Pick<LotInput, "fuel" | "engineCc">): number {
  if (lot.fuel === "electric") return 0;
  if (lot.fuel === "hybrid") return lot.engineCc > 3500 ? 18.6 : lot.engineCc > 2000 ? 9.3 : 1.55;
  return lot.engineCc > 2000 ? 18.6 : 3.1;
}

export function usBuiltVin(vin: string): boolean {
  return /^[145]/.test((vin || "").trim().toUpperCase());
}

export function plDutyPct(lot: LotInput): number {
  if (regionOf(lot.auction) === "eu") return 0;
  return lot.usOrigin ? 0 : 10;
}

const GROUP: Record<Region, string> = {
  us: "Zakup w USA i transport do UE",
  ca: "Zakup w Kanadzie i transport do UE",
  eu: "Zakup w UE i transport do Polski",
  ae: "Zakup w ZEA i transport do UE",
};

const LINES: Record<Region, { inland: string; ocean: string }> = {
  us: { inland: "Transport do portu w USA", ocean: "Fracht morski do portu w UE" },
  ca: { inland: "Transport do portu w Kanadzie", ocean: "Fracht morski z Kanady" },
  eu: { inland: "Odbiór z placu aukcji", ocean: "Laweta do Polski" },
  ae: { inland: "Transport do portu Dżebel Ali", ocean: "Fracht morski z ZEA" },
};

interface Parts {
  bid: number;
  auctionFee: number;
  inland: number;
  ocean: number;
  port: number;
  transport: number;
  registration: number;
  companyFee: number;
  firstService: number;
}

function resolve(lot: LotInput, s: Settings, o: CostOverrides, bidOverride?: number): Parts {
  const rate = s.usdPln > 0 ? s.usdPln : 1;
  const local = (v: number) => v / rate;
  const region = regionOf(lot.auction);
  const r = regionalRates(region, s);
  const bid = bidOverride ?? num(o.bidUsd, lot.bidUsd);
  const eu = region === "eu";
  return {
    bid,
    auctionFee: bidOverride === undefined && o.auctionFeeUsd !== undefined ? num(o.auctionFeeUsd) : estimateAuctionFee(bid, s, lot.auction),
    inland: num(o.inlandUsUsd, r.inland),
    ocean: num(o.oceanUsd, r.ocean),
    port: eu ? 0 : num(o.portUaUsd, local(s.plPortPln)),
    transport: eu ? 0 : num(o.deliveryUaUsd, local(s.plTransportPln)),
    registration: num(o.certificationUsd, local(s.plRegistrationPln)),
    companyFee: num(o.companyFeeUsd, local(s.plCompanyFeePln)),
    firstService: num(o.firstServiceUsd, local(s.plFirstServicePln)),
  };
}

function taxes(lot: LotInput, s: Settings, p: Parts) {
  const eu = regionOf(lot.auction) === "eu";
  const customsValue = eu ? p.bid + p.auctionFee : p.bid + p.auctionFee + p.inland + p.ocean;
  const dutyPct = plDutyPct(lot);
  const duty = (customsValue * dutyPct) / 100;
  const aPct = akcyzaPct(lot);
  const akcyza = ((customsValue + duty) * aPct) / 100;
  const clearance = PL_VAT[s.plClearance] ?? PL_VAT.pl;
  const vatBase = eu ? 0 : s.plClearance === "pl" ? customsValue + duty + akcyza : customsValue + duty;
  const vat = (vatBase * clearance.pct) / 100;
  return { eu, customsValue, dutyPct, duty, aPct, akcyza, vatPct: eu ? 0 : clearance.pct, vat, clearance };
}

function baseTotal(lot: LotInput, s: Settings, o: CostOverrides, bid?: number): number {
  const p = resolve(lot, s, o, bid);
  const c = taxes(lot, s, p);
  return p.bid + p.auctionFee + p.inland + p.ocean + c.duty + c.akcyza + c.vat + p.port + p.transport + p.registration + p.companyFee;
}

export function marketUsdPl(lot: LotInput, s: Settings, o: CostOverrides): number {
  const rate = s.usdPln > 0 ? s.usdPln : 1;
  const local = num(o.marketPricePln, num(lot.marketPricePln, NaN));
  if (Number.isFinite(local)) return Math.max(0, local) / rate;
  return Math.max(0, num(o.marketPriceUsd, lot.marketPriceUsd));
}

export function calculatePl(lot: LotInput, s: Settings, o: CostOverrides, repair: { min: number; max: number }): CostResult {
  const rate = s.usdPln > 0 ? s.usdPln : 1;
  const region = regionOf(lot.auction);
  const p = resolve(lot, s, o);
  const c = taxes(lot, s, p);
  const repairMin = Math.max(0, num(o.repairMinUsd, repair.min));
  const repairMax = Math.max(repairMin, num(o.repairMaxUsd, repair.max));
  const repairMid = (repairMin + repairMax) / 2;
  const cv = pln(c.customsValue * rate);

  const groups: CostGroup[] = [
    {
      title: GROUP[region],
      lines: [
        { key: "bid", label: "Stawka na aukcji", usd: p.bid, editable: "bidUsd", inputUsd: true, hint: `${Math.round(p.bid).toLocaleString("pl-PL")} $ · kurs NBP ${rate.toLocaleString("pl-PL")} zł` },
        { key: "auctionFee", label: "Opłaty aukcji", usd: p.auctionFee, editable: "auctionFeeUsd", inputUsd: true, hint: o.auctionFeeUsd !== undefined ? "zmienione ręcznie" : `${Math.round(p.auctionFee).toLocaleString("pl-PL")} $` },
        { key: "inlandUs", label: LINES[region].inland, usd: p.inland, editable: "inlandUsUsd", inputUsd: true },
        { key: "ocean", label: LINES[region].ocean, usd: p.ocean, editable: "oceanUsd", inputUsd: true },
      ],
      subtotal: 0,
    },
    {
      title: "Cło i podatki",
      lines: c.eu
        ? [{ key: "excise", label: "Akcyza", usd: c.akcyza, hint: `${pct(c.aPct)} od ceny zakupu · auto z UE bez cła i VAT przy imporcie` }]
        : [
            {
              key: "duty",
              label: "Cło",
              usd: c.duty,
              hint: c.dutyPct === 0 ? "0 %: auto wyprodukowane w USA, potrzebne świadectwo pochodzenia" : `10 % wartości celnej ${cv}`,
            },
            { key: "excise", label: "Akcyza", usd: c.akcyza, hint: `${pct(c.aPct)} od wartości celnej z cłem` },
            {
              key: "vat",
              label: `VAT ${c.vatPct} %`,
              usd: c.vat,
              hint: s.plClearance === "pl" ? `${c.clearance.label}: od wartości celnej, cła i akcyzy` : `${c.clearance.label}: od wartości celnej i cła`,
            },
          ],
      subtotal: 0,
    },
    {
      title: "Polska",
      lines: [
        ...(c.eu
          ? []
          : [
              { key: "portUa", label: "Port i agencja celna", usd: p.port, editable: "portUaUsd" as const },
              { key: "deliveryUa", label: "Transport z portu do Polski", usd: p.transport, editable: "deliveryUaUsd" as const },
            ]),
        { key: "certification", label: "Tłumaczenia, przegląd, rejestracja", usd: p.registration, editable: "certificationUsd" },
        { key: "companyFee", label: "Usługi firmy", usd: p.companyFee, editable: "companyFeeUsd" },
      ],
      subtotal: 0,
    },
    {
      title: "Po zakupie",
      lines: [
        { key: "repair", label: "Naprawa (średnio)", usd: repairMid, hint: `widełki ${pln(repairMin * rate)} – ${pln(repairMax * rate)}` },
        { key: "firstService", label: "Pierwszy serwis", usd: p.firstService, editable: "firstServiceUsd" },
      ],
      subtotal: 0,
    },
  ];

  for (const g of groups) {
    g.lines = g.lines.map((l) => ({ ...l, usd: Math.round(l.usd * 100) / 100 }));
    g.subtotal = g.lines.reduce((sum, l) => sum + l.usd, 0);
  }

  const base = baseTotal(lot, s, o);
  const totalMin = base + repairMin;
  const totalMax = base + repairMax;
  const totalMid = base + repairMid;
  const market = marketUsdPl(lot, s, o);
  const savings = market > 0 ? market - totalMid : 0;
  const savingsPct = market > 0 ? (savings / market) * 100 : 0;

  let maxBid: number | null = null;
  if (market > 0) {
    const budget = market * (1 - s.targetSavingsPct / 100) - repairMax;
    if (baseTotal(lot, s, o, 0) <= budget) {
      let lo = 0;
      let hi = market;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (baseTotal(lot, s, o, mid) <= budget) lo = mid;
        else hi = mid;
      }
      maxBid = Math.floor(lo / 25) * 25;
    } else {
      maxBid = 0;
    }
  }

  return {
    currency: "PLN",
    rate,
    groups,
    customsValueUsd: round(c.customsValue),
    ageCoefficient: 0,
    exciseEur: 0,
    pensionPct: 0,
    repairMinUsd: round(repairMin),
    repairMaxUsd: round(repairMax),
    baseUsd: base,
    totalMinUsd: totalMin,
    totalMaxUsd: totalMax,
    totalMidUsd: totalMid,
    marketPriceUsd: market,
    savingsUsd: savings,
    savingsPct,
    maxBidUsd: maxBid,
  };
}

export function pricingSettings<T extends Pick<Settings, "market" | "usdPln" | "plLaborPln" | "plPaintPln" | "laborRateUsd" | "paintPerPanelUsd" | "partsDeliveryPlUsd">>(s: T): T {
  if (s.market !== "pl") return s;
  const rate = s.usdPln > 0 ? s.usdPln : 1;
  return { ...s, laborRateUsd: s.plLaborPln / rate, paintPerPanelUsd: s.plPaintPln / rate, partsDeliveryPlUsd: Math.min(s.partsDeliveryPlUsd, 60 / rate) };
}
