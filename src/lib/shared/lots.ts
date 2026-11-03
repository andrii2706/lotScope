import type { ActiveLot } from "@/types/auction";

export function auctionTime(iso: string): { date: string; left: string } {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return { date: iso || "дата невідома", left: "" };
  const date = new Date(t).toLocaleString("uk-UA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const diff = t - Date.now();
  if (diff <= 0) return { date, left: "торги йдуть" };
  const hours = Math.floor(diff / 3600_000);
  const left = hours < 24 ? `через ${hours} год ${Math.floor((diff % 3600_000) / 60_000)} хв` : `через ${Math.floor(hours / 24)} дн.`;
  return { date, left };
}

export function analyzeHref(lot: ActiveLot): string {
  const params = new URLSearchParams();
  if (lot.lotNumber) {
    params.set("lot", lot.lotNumber);
    if (lot.auction !== "Other") params.set("auction", lot.auction);
  } else if (lot.vin) {
    params.set("vin", lot.vin);
  }
  return `/?${params.toString()}`;
}
