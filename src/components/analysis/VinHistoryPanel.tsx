"use client";

import { CircleAlert, Gavel, LoaderCircle, ScrollText } from "lucide-react";
import { OutLink } from "@/components/ui";
import { usd } from "@/lib/shared/calc";
import { mileageIssues, odometerReadings } from "@/lib/shared/vinhistory";
import type { VinHistoryState } from "@/types/vin";
import { t, localeOf } from "@/lib/shared/i18n";

export function VinHistoryPanel({ state }: { state: VinHistoryState }) {
  if (state.status === "idle") {
    return (
      <p className="rounded-xl border border-dashed border-line2 px-4 py-3 text-sm text-muted">
        {t("Вкажіть VIN (або знайдіть лот угорі), і історія за VIN підтягнеться автоматично.")}
      </p>
    );
  }
  if (state.status === "loading") {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-line2 bg-paper px-4 py-3 text-sm font-bold">
        <LoaderCircle className="size-4.5 animate-spin text-accent-text" /> {t("Шукаю історію за VIN")} {state.vin}…
      </p>
    );
  }
  if (state.status === "error") {
    return <p className="rounded-xl border border-line2 bg-bad-bg px-4 py-3 text-sm font-semibold text-bad">{t(state.message)}</p>;
  }

  const { response } = state;
  const linkRow = (
    <div className="flex flex-wrap gap-2">
      {response.links.map((l) => (
        <OutLink key={l.href} link={l} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line2 bg-surface px-3.5 text-[13px] font-bold hover:bg-panel2" />
      ))}
    </div>
  );

  if (!response.configured) {
    return (
      <div className="space-y-3">
        <p className="rounded-xl border border-line2 bg-warn-bg px-4 py-3 text-sm text-warn">
          <span className="font-semibold">{t("Автоматична історія зараз недоступна.")}</span> {t("Відкрийте звіт за посиланням і додайте його нижче.")}
        </p>
        {linkRow}
      </div>
    );
  }

  const h = response.history;
  if (!h) {
    return (
      <div className="space-y-3">
        <p className="rounded-xl border border-line2 bg-paper px-4 py-3 text-sm text-muted">{t(response.message ?? "")}</p>
        {linkRow}
      </div>
    );
  }

  const issues = mileageIssues(h);
  const readings = odometerReadings(h);
  return (
    <div className="space-y-4">
      <p className="text-sm font-bold text-good">
        {t("Історію підтягнуто автоматично:")} {h.sources.join(", ")}{t(". Вона піде в аналіз разом із фото.")}
      </p>
      {issues.map((i) => (
        <p key={i} className="flex gap-2 rounded-xl bg-bad-bg px-4 py-3 text-sm font-semibold text-bad">
          <CircleAlert className="mt-0.5 size-4 shrink-0" /> {i}
        </p>
      ))}
      {h.auctionSales.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-muted">
            <Gavel className="size-3.5" /> {t("На аукціонах")}
          </p>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {h.auctionSales.map((s, i) => (
              <li key={`${s.lotNumber}-${i}`} className="grid gap-1 px-4 py-2.5 text-sm sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                <span className="font-mono text-xs text-muted">{s.date.slice(0, 10) || "—"}</span>
                <span className="min-w-0">
                  <span className="font-bold">{s.auction || t("Аукціон")}</span>
                  {s.lotNumber && <span className="text-muted"> {t("· лот")} {s.lotNumber}</span>}
                  {s.damage && <span className="text-muted"> · {s.damage}</span>}
                  {s.odometer > 0 && <span className="text-muted"> · {s.odometer.toLocaleString(localeOf())} mi</span>}
                </span>
                <span className="font-bold">{s.priceUsd ? usd(s.priceUsd) : s.status || "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {(h.brands.length > 0 || h.titleRecords.length > 0) && (
        <div>
          <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-muted">
            <ScrollText className="size-3.5" /> {t("Титули та статуси (NMVTIS)")}
          </p>
          <ul className="space-y-1.5 text-sm">
            {h.brands.map((b, i) => (
              <li key={`b-${i}`} className="flex gap-2">
                <span className="w-24 shrink-0 font-mono text-xs text-muted">{b.date.slice(0, 10)}</span>
                <span className="font-bold text-warn">{b.name}</span>
                <span className="text-muted">{b.source}</span>
              </li>
            ))}
            {h.titleRecords.map((item, i) => (
              <li key={`t-${i}`} className="flex gap-2">
                <span className="w-24 shrink-0 font-mono text-xs text-muted">{item.date.slice(0, 10)}</span>
                <span>{t("Титул")} {item.state}</span>
                {item.odometer > 0 && <span className="text-muted">{item.odometer.toLocaleString(localeOf())} {item.unit}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {readings.length === 0 && h.brands.length === 0 && h.auctionSales.length === 0 && (
        <p className="text-sm text-muted">{t("Записів не знайдено.")}</p>
      )}
      {linkRow}
    </div>
  );
}
