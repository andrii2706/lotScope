"use client";

import { CircleAlert, ExternalLink, Gavel, Lock, LoaderCircle, ScrollText } from "lucide-react";
import Link from "next/link";
import { usd } from "@/lib/calc";
import type { VinHistoryState } from "@/lib/useVinHistory";
import { mileageIssues, odometerReadings } from "@/lib/vinhistory";

export function VinHistoryPanel({ state, onUnlock }: { state: VinHistoryState; onUnlock: () => void }) {
  if (state.status === "idle") {
    return (
      <p className="rounded-xl border border-dashed border-line2 px-4 py-3 text-sm text-muted">
        Вкажіть VIN (або знайдіть лот угорі), і історія за VIN підтягнеться автоматично.
      </p>
    );
  }
  if (state.status === "loading") {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-line2 bg-paper px-4 py-3 text-sm font-bold">
        <LoaderCircle className="size-4.5 animate-spin text-accent-text" /> Шукаю історію за VIN {state.vin}…
      </p>
    );
  }
  if (state.status === "error") {
    return <p className="rounded-xl border border-line2 bg-bad-bg px-4 py-3 text-sm font-semibold text-bad">{state.message}</p>;
  }

  const { response } = state;
  const linkRow = (
    <div className="flex flex-wrap gap-2">
      {response.links.map((l) => (
        <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line2 bg-surface px-3.5 text-[13px] font-bold hover:bg-panel2">
          {l.label} <ExternalLink className="size-3.5" />
        </a>
      ))}
    </div>
  );

  if (response.locked) {
    const canPay = (response.credits ?? 0) > 0;
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line2 bg-paper px-4 py-3">
          <Lock className="size-4.5 shrink-0 text-muted" />
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-extrabold">Історія за VIN доступна за тарифом.</span> Відкриття лота коштує один аналіз, а потім перший аналіз цього лота безкоштовний.
          </p>
          {canPay ? (
            <button type="button" onClick={onUnlock} className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-extrabold text-accent-ink hover:brightness-110">
              Відкрити за 1 аналіз
            </button>
          ) : (
            <Link href="/billing" className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-extrabold text-accent-ink hover:brightness-110">
              Обрати тариф
            </Link>
          )}
        </div>
        {linkRow}
      </div>
    );
  }

  if (!response.configured) {
    return (
      <div className="space-y-3">
        <p className="rounded-xl border border-line2 bg-warn-bg px-4 py-3 text-sm text-warn">
          <span className="font-extrabold">Автоматична історія вимкнена.</span> Додайте AUCTION_API_KEY (історія аукціонів) та/або
          ключ VinAudit (записи NMVTIS) у .env.local. Поки що відкрийте звіт за посиланням і додайте його нижче.
        </p>
        {linkRow}
      </div>
    );
  }

  const h = response.history;
  if (!h) {
    return (
      <div className="space-y-3">
        <p className="rounded-xl border border-line2 bg-paper px-4 py-3 text-sm text-muted">{response.message}</p>
        {linkRow}
      </div>
    );
  }

  const issues = mileageIssues(h);
  const readings = odometerReadings(h);
  return (
    <div className="space-y-4">
      <p className="text-sm font-bold text-good">
        Історію підтягнуто автоматично: {h.sources.join(", ")}. Вона піде в аналіз разом із фото.
      </p>
      {issues.map((i) => (
        <p key={i} className="flex gap-2 rounded-xl bg-bad-bg px-4 py-3 text-sm font-semibold text-bad">
          <CircleAlert className="mt-0.5 size-4 shrink-0" /> {i}
        </p>
      ))}
      {h.auctionSales.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
            <Gavel className="size-3.5" /> На аукціонах
          </p>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {h.auctionSales.map((s, i) => (
              <li key={`${s.lotNumber}-${i}`} className="grid gap-1 px-4 py-2.5 text-sm sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                <span className="font-mono text-xs text-muted">{s.date.slice(0, 10) || "—"}</span>
                <span className="min-w-0">
                  <span className="font-bold">{s.auction || "Аукціон"}</span>
                  {s.lotNumber && <span className="text-muted"> · лот {s.lotNumber}</span>}
                  {s.damage && <span className="text-muted"> · {s.damage}</span>}
                  {s.odometer > 0 && <span className="text-muted"> · {s.odometer.toLocaleString("uk-UA")} mi</span>}
                </span>
                <span className="font-bold">{s.priceUsd ? usd(s.priceUsd) : s.status || "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {(h.brands.length > 0 || h.titleRecords.length > 0) && (
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
            <ScrollText className="size-3.5" /> Титули та статуси (NMVTIS)
          </p>
          <ul className="space-y-1.5 text-sm">
            {h.brands.map((b, i) => (
              <li key={`b-${i}`} className="flex gap-2">
                <span className="w-24 shrink-0 font-mono text-xs text-muted">{b.date.slice(0, 10)}</span>
                <span className="font-bold text-warn">{b.name}</span>
                <span className="text-muted">{b.source}</span>
              </li>
            ))}
            {h.titleRecords.map((t, i) => (
              <li key={`t-${i}`} className="flex gap-2">
                <span className="w-24 shrink-0 font-mono text-xs text-muted">{t.date.slice(0, 10)}</span>
                <span>Титул {t.state}</span>
                {t.odometer > 0 && <span className="text-muted">{t.odometer.toLocaleString("uk-UA")} {t.unit}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {readings.length === 0 && h.brands.length === 0 && h.auctionSales.length === 0 && (
        <p className="text-sm text-muted">Записів не знайдено.</p>
      )}
      {linkRow}
    </div>
  );
}
