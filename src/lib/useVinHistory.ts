"use client";

import { useCallback, useEffect, useState } from "react";
import { refreshMe } from "./me";
import { cleanVin } from "./vin";
import type { VinHistoryResponse } from "./vinhistory";

export type VinHistoryState =
  | { status: "idle" }
  | { status: "loading"; vin: string }
  | { status: "done"; vin: string; response: VinHistoryResponse }
  | { status: "error"; vin: string; message: string };

export function useVinHistory(rawVin: string): [VinHistoryState, () => void] {
  const vin = cleanVin(rawVin);
  const valid = /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
  const [state, setState] = useState<VinHistoryState>({ status: "idle" });
  const [unlockVin, setUnlockVin] = useState("");
  const unlock = useCallback(() => setUnlockVin(vin), [vin]);

  useEffect(() => {
    if (!valid) return;
    let active = true;
    const timer = setTimeout(async () => {
      setState({ status: "loading", vin });
      try {
        const res = await fetch("/api/history", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ vin, unlock: unlockVin === vin }),
        });
        const data = (await res.json().catch(() => null)) as (VinHistoryResponse & { error?: string }) | null;
        if (!active) return;
        if (!res.ok || !data || data.error) {
          setState({ status: "error", vin, message: data?.error || "Не вдалося отримати історію за VIN." });
        } else {
          setState({ status: "done", vin, response: data });
          if (unlockVin === vin) void refreshMe();
        }
      } catch {
        if (active) setState({ status: "error", vin, message: "Не вдалося отримати історію за VIN." });
      }
    }, 600);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [vin, valid, unlockVin]);

  if (!valid) return [{ status: "idle" }, unlock];
  if (state.status !== "idle" && state.vin !== vin) return [{ status: "loading", vin }, unlock];
  return [state, unlock];
}
