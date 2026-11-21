"use client";

import { useSyncExternalStore } from "react";
import { getLang, setLang, subscribeLang } from "../shared/i18n.ts";
import type { Lang } from "../shared/i18n.ts";

const KEY = "lotscope.lang";

export function rememberLang(next: Lang): void {
  setLang(next);
  try {
    localStorage.setItem(KEY, next);
  } catch {}
  if (typeof document !== "undefined") {
    document.documentElement.lang = next;
    document.documentElement.dataset.market = next === "pl" ? "pl" : "ua";
  }
}

export function bootLang(): void {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {}
  const guess = stored === "pl" || stored === "uk" ? stored : typeof navigator !== "undefined" && /^pl\b/i.test(navigator.language) ? "pl" : "uk";
  rememberLang(guess);
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribeLang, getLang, () => "uk");
}
