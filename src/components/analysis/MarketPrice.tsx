"use client";

import { ExternalLink, LoaderCircle, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { usd } from "@/lib/shared/calc";
import { responseMessage } from "@/lib/shared/errors";
import type { MarketResponse } from "@/types/pricing";
import type { LotInput } from "@/types/report";

export function marketSourceText(r: MarketResponse): string {
  const s = r.stats;
  if (!s) return "";
  return `AUTO.RIA: медіана ${s.used} оголошень, ${s.query}; середина ринку ${usd(s.p25Usd)}–${usd(s.p75Usd)}`;
}

export function MarketPrice({ lot, onPrice }: { lot: LotInput; onPrice: (usdValue: number, source: string) => void }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MarketResponse | null>(null);

  useEffect(() => {
    let alive = true;
    void fetch("/api/market")
      .then((r) => r.json())
      .then((d: { configured?: boolean }) => alive && setConfigured(Boolean(d.configured)))
      .catch(() => alive && setConfigured(false));
    return () => {
      alive = false;
    };
  }, []);

  if (configured === null) return null;
  if (!configured) {
    return <p className="text-xs text-muted sm:col-span-2">Автоматична ринкова ціна з AUTO.RIA зараз не підключена, вкажіть ціну вручну.</p>;
  }
  const ready = Boolean(lot.make.trim() && lot.model.trim() && lot.year);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/market", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ make: lot.make, model: lot.model, year: lot.year }),
      });
      const data = (await res.json().catch(() => null)) as (MarketResponse & { error?: string }) | null;
      if (!data || data.error) {
        setResult({ configured: true, found: false, message: responseMessage("/api/market", res.status, data, "Не вдалося отримати ринкові ціни. Вкажіть ціну вручну.") });
        return;
      }
      setResult(data);
      if (data.found && data.stats) onPrice(data.stats.medianUsd, marketSourceText(data));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sm:col-span-2">
      <button
        type="button"
        onClick={run}
        disabled={!ready || busy}
        title={ready ? "Порахувати медіану схожих авто на AUTO.RIA" : "Спершу вкажіть марку, модель і рік"}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-line2 bg-surface px-4 text-sm font-bold transition hover:bg-panel2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : <TrendingUp className="size-4 text-accent-text" />}
        {busy ? "Шукаю ціни на AUTO.RIA…" : "Оцінити ринкову ціну за AUTO.RIA"}
      </button>
      {result && (
        <div role="status" className={`mt-2.5 rounded-xl px-3.5 py-3 text-sm ${result.found ? "bg-good-bg text-ink" : "bg-warn-bg text-ink"}`}>
          {result.found && result.stats ? (
            <>
              <p className="font-bold">
                Підставлено медіану {usd(result.stats.medianUsd)} з {result.stats.used} оголошень ({result.stats.query}).
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Середина ринку {usd(result.stats.p25Usd)}–{usd(result.stats.p75Usd)}. AUTO.RIA рахує всі оголошення, тож медіана може
                включати авто після ДТП чи нерозмитнені. Ціну можна виправити вручну.
              </p>
              {result.stats.links?.length > 0 && (
                <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {result.stats.links.map((href, i) => (
                    <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-accent-text hover:underline">
                      Оголошення {i + 1} <ExternalLink className="size-3" />
                    </a>
                  ))}
                </p>
              )}
            </>
          ) : (
            <p className="font-bold">{result.message || "Ціни не знайдено. Вкажіть ціну вручну."}</p>
          )}
        </div>
      )}
    </div>
  );
}
