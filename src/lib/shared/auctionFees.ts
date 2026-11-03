import type { AuctionFeeBreakdown } from "@/types/auction";
import type { LotInput } from "@/types/report";

const BUYER_FEE: [number, number][] = [
  [50, 25], [100, 45], [200, 80], [300, 130], [350, 137.5], [400, 145], [450, 175], [500, 185],
  [550, 205], [600, 210], [700, 240], [800, 270], [900, 295], [1000, 320], [1200, 375], [1300, 395],
  [1400, 410], [1500, 430], [1600, 445], [1700, 465], [1800, 485], [2000, 510], [2400, 535],
  [2500, 570], [3000, 610], [3500, 655], [4000, 705], [4500, 725], [5000, 750], [5500, 775],
  [6000, 800], [6500, 825], [7000, 845], [7500, 880], [8000, 900], [8500, 925], [10000, 945],
  [15000, 1000],
];

const COPART_BID_FEE: [number, number][] = [
  [100, 0], [500, 49], [1500, 79], [5000, 99], [8000, 119], [Infinity, 129],
];

const IAAI_BID_FEE: [number, number][] = [
  [100, 0], [500, 40], [1000, 55], [2000, 75], [4000, 100], [6000, 110], [8000, 125], [Infinity, 140],
];

function bracket(table: [number, number][], bid: number): number {
  for (const [upTo, fee] of table) if (bid < upTo) return fee;
  return table[table.length - 1][1];
}

export function buyerFee(bid: number): number {
  if (bid <= 0) return 0;
  if (bid >= 15000) return bid * 0.075;
  return bracket(BUYER_FEE, bid);
}

export function tableAuctionFee(bid: number, auction: LotInput["auction"]): AuctionFeeBreakdown {
  if (bid <= 0) return { total: 0, hint: "" };
  const buyer = buyerFee(bid);
  if (auction === "IAAI") {
    const bidFee = bracket(IAAI_BID_FEE, bid);
    const fixed = 105 + 15 + 20;
    return {
      total: Math.round(buyer + bidFee + fixed),
      hint: `IAAI: buyer ${Math.round(buyer)} + bid ${bidFee} + service 105 + env 15 + title 20 $`,
    };
  }
  const bidFee = bracket(COPART_BID_FEE, bid);
  const fixed = 95 + 15 + 20;
  const label = auction === "Copart" ? "Copart" : "сітка Copart";
  return {
    total: Math.round(buyer + bidFee + fixed),
    hint: `${label}: buyer ${Math.round(buyer)} + virtual bid ${bidFee} + gate 95 + env 15 + title 20 $`,
  };
}
