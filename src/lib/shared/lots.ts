import type { ActiveLot } from "@/types/auction";
import { t, localeOf } from "./i18n.ts";

export function auctionTime(iso: string): { date: string; left: string } {
  const item = Date.parse(iso);
  if (!Number.isFinite(item)) return { date: t("дата ще не призначена"), left: "" };
  const date = new Date(item).toLocaleString(localeOf(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const diff = item - Date.now();
  if (diff <= 0) return { date, left: t("торги йдуть") };
  const hours = Math.floor(diff / 3600_000);
  const left = hours < 24 ? t("через {v0} год {v1} хв", { v0: hours, v1: Math.floor((diff % 3600_000) / 60_000) }) : t("через {v0} дн.", { v0: Math.floor(hours / 24) });
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
