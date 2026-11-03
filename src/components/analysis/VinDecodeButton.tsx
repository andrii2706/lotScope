"use client";

import { LoaderCircle, ScanLine } from "lucide-react";
import { useEffect, useState } from "react";
import { isEuPlant } from "@/lib/shared/auctions";
import { userMessage, responseMessage } from "@/lib/shared/errors";
import type { VinDecoded } from "@/types/auction";

export function VinDecodeButton({ vin, onDecoded }: { vin: string; onDecoded: (d: VinDecoded) => void }) {
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    void fetch("/api/vin-decode")
      .then((r) => r.json())
      .then((d: { configured?: boolean }) => alive && setConfigured(Boolean(d.configured)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!configured) return null;
  const ready = /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);

  async function run() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/vin-decode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vin }),
      });
      const data = (await res.json().catch(() => null)) as { decoded?: VinDecoded; error?: string } | null;
      if (!res.ok || !data?.decoded) throw new Error(responseMessage("/api/vin-decode", res.status, data, "Не вдалося розшифрувати VIN."));
      const d = data.decoded;
      onDecoded(d);
      const plant = d.plantCountry ? `, завод: ${[d.plantCity, d.plantCountry].filter(Boolean).join(", ")}${isEuPlant(d.plantCountry) ? " (ЄС)" : ""}` : "";
      setNote({ ok: true, text: `${[d.year, d.make, d.model].filter(Boolean).join(" ")}${d.engineCc ? `, ${(d.engineCc / 1000).toFixed(1)} л` : ""}${plant}. Порожні поля заповнено.` });
    } catch (e) {
      setNote({ ok: false, text: userMessage(e, "Не вдалося розшифрувати VIN.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="mt-2 block">
      <button
        type="button"
        onClick={run}
        disabled={!ready || busy}
        title={ready ? "Розшифрувати VIN і заповнити дані авто" : "Введіть повний VIN з 17 символів"}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line2 bg-surface px-3 text-[13px] font-bold transition hover:bg-panel2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : <ScanLine className="size-4 text-accent-text" />}
        Розшифрувати VIN
      </button>
      {note && (
        <span role="status" className={`mt-1.5 block text-xs ${note.ok ? "text-muted" : "font-bold text-bad"}`}>
          {note.text}
        </span>
      )}
    </span>
  );
}
