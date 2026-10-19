"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { ThemeChoice } from "./types";

const QUERY = "(prefers-color-scheme: light)";

function subscribe(callback: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function useResolvedTheme(choice: ThemeChoice): "dark" | "light" {
  const systemLight = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
  const theme = choice === "system" ? (systemLight ? "light" : "dark") : choice;
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return theme;
}

export const THEME_BOOT_SCRIPT = `try{var s=JSON.parse(localStorage.getItem("lotscope.settings.v1")||"{}");var t=s.theme||"dark";if(t==="system"){t=matchMedia("${QUERY}").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}`;
