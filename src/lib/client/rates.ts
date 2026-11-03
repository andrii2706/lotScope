"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useSettings } from "./store.ts";
import type { Rates } from "@/types/pricing";
import type { Settings } from "@/types/report";

let rates: Rates | null = null;
let requested = false;
const listeners = new Set<() => void>();

function load() {
  if (requested) return;
  requested = true;
  void fetch("/api/rates")
    .then((r) => (r.ok ? r.json() : null))
    .then((data: { rates?: Rates | null } | null) => {
      rates = data?.rates ?? null;
      listeners.forEach((l) => l());
    })
    .catch(() => {
      requested = false;
    });
}

export function useRates(): Rates | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      load();
      return () => listeners.delete(l);
    },
    () => rates,
    () => null,
  );
}

export function applyRates(settings: Settings, live: Rates | null): Settings {
  if (!settings.autoRates || !live) return settings;
  return {
    ...settings,
    usdUah: Math.round(live.usdUah * 100) / 100,
    eurUsd: Math.round((live.eurUah / live.usdUah) * 1000) / 1000,
    plnUsd: live.plnUah ? Math.round((live.plnUah / live.usdUah) * 1000) / 1000 : settings.plnUsd,
  };
}

export function useCostSettings(): Settings {
  const settings = useSettings();
  const live = useRates();
  return useMemo(() => applyRates(settings, live), [settings, live]);
}
