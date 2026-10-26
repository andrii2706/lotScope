import type { AirbagStatus, Level, LotInput, PartAction, Verdict } from "./types";

export const VERDICT: Record<Verdict, { label: string; tone: "good" | "warn" | "bad"; text: string }> = {
  buy: { label: "Можна брати", tone: "good", text: "Пошкодження обмежені, критичних ризиків не видно." },
  caution: {
    label: "З обережністю",
    tone: "warn",
    text: "Результат залежить від того, чого не видно на фото.",
  },
  avoid: { label: "Краще пропустити", tone: "bad", text: "Ризики або ремонт надто великі для цього лота." },
};

export const LEVEL: Record<Level, string> = { low: "низький", medium: "середній", high: "високий" };
export const LIKELIHOOD: Record<Level, string> = {
  low: "малоймовірно",
  medium: "можливо",
  high: "найімовірніше",
};
export const CONFIDENCE: Record<Level, string> = { low: "низька", medium: "середня", high: "висока" };

export const ACTION: Record<PartAction, string> = {
  replace: "Заміна",
  repair: "Ремонт",
  paint: "Фарбування",
  inspect: "Перевірити",
};

export const AIRBAG: Record<AirbagStatus, string> = {
  not_deployed: "не спрацювали",
  deployed: "спрацювали",
  unknown: "невідомо",
};

export const FUEL: Record<LotInput["fuel"], string> = {
  petrol: "бензин",
  diesel: "дизель",
  hybrid: "гібрид",
  electric: "електро",
};

export const RUN: Record<LotInput["runStatus"], string> = {
  run_drive: "Run & Drive",
  starts: "Starts",
  no_start: "не заводиться",
  unknown: "",
};

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

export function mileageText(lot: LotInput): string {
  if (!lot.mileage) return "";
  const km = lot.mileageUnit === "mi" ? Math.round(lot.mileage * 1.609) : lot.mileage;
  const main = `${Math.round(km).toLocaleString("uk-UA")} км`;
  return lot.mileageUnit === "mi" ? `${main} (${lot.mileage.toLocaleString("uk-UA")} миль)` : main;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" });
}
