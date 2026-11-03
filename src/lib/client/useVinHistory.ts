"use client";

import { useEffect, useState } from "react";
import { cleanVin } from "../shared/vin.ts";
import { responseMessage } from "../shared/errors.ts";
import type { VinHistoryState, VinHistoryResponse } from "@/types/vin";

export function useVinHistory(rawVin: string): VinHistoryState {
  const vin = cleanVin(rawVin);
  const valid = /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
  const [state, setState] = useState<VinHistoryState>({ status: "idle" });

  useEffect(() => {
    if (!valid) return;
    let active = true;
    const timer = setTimeout(async () => {
      setState({ status: "loading", vin });
      try {
        const res = await fetch("/api/history", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ vin }),
        });
        const data = (await res.json().catch(() => null)) as (VinHistoryResponse & { error?: string }) | null;
        if (!active) return;
        if (!res.ok || !data || data.error) {
          setState({ status: "error", vin, message: responseMessage("/api/history", res.status, data, "Не вдалося отримати історію за VIN.") });
        } else {
          setState({ status: "done", vin, response: data });
        }
      } catch {
        if (active) setState({ status: "error", vin, message: "Не вдалося отримати історію за VIN." });
      }
    }, 600);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [vin, valid]);

  if (!valid) return { status: "idle" };
  if (state.status !== "idle" && state.vin !== vin) return { status: "loading", vin };
  return state;
}
