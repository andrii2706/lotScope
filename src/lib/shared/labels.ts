import type { AirbagStatus, Level, LotInput, PartAction, Verdict } from "@/types/report";
import { L, localeOf } from "./i18n.ts";

export const VERDICT: Record<Verdict, { label: string; tone: "good" | "warn" | "bad"; text: string }> = L({
  buy: { label: "Можна брати", tone: "good", text: "Пошкодження обмежені, критичних ризиків не видно." },
  caution: {
    label: "З обережністю",
    tone: "warn",
    text: "Результат залежить від того, чого не видно на фото.",
  },
  avoid: { label: "Краще пропустити", tone: "bad", text: "Ризики або ремонт надто великі для цього лота." },
});

export const LEVEL: Record<Level, string> = L({ low: "низький", medium: "середній", high: "високий" });
export const LIKELIHOOD: Record<Level, string> = L({
  low: "малоймовірно",
  medium: "можливо",
  high: "найімовірніше",
});
export const CONFIDENCE: Record<Level, string> = L({ low: "низька", medium: "середня", high: "висока" });

export const ACTION: Record<PartAction, string> = L({
  replace: "Заміна",
  repair: "Ремонт",
  paint: "Фарбування",
  inspect: "Перевірити",
});

export const AIRBAG: Record<AirbagStatus, string> = L({
  not_deployed: "не спрацювали",
  deployed: "спрацювали",
  unknown: "невідомо",
});

export const FUEL: Record<LotInput["fuel"], string> = L({
  petrol: "бензин",
  diesel: "дизель",
  hybrid: "гібрид",
  electric: "електро",
});


export const TONE_TEXT = { good: "text-good", warn: "text-warn", bad: "text-bad" } as const;
export const TONE_BG = { good: "bg-good-bg", warn: "bg-warn-bg", bad: "bg-bad-bg" } as const;
export const LEVEL_TONE: Record<Level, "good" | "warn" | "bad"> = {
  low: "good",
  medium: "warn",
  high: "bad",
};

export function lotTitle(lot: LotInput): string {
  return `${lot.year} ${lot.make} ${lot.model}`.trim();
}


export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(localeOf(), { day: "numeric", month: "long", year: "numeric" });
}

export const stamp = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(localeOf(), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
