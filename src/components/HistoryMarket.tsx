import { BarChart3, ExternalLink, History } from "lucide-react";
import type { Comparables } from "@/lib/auction";
import type { Analysis } from "@/lib/types";
import { cleanVin } from "@/lib/vin";
import type { VinHistory } from "@/lib/vinhistory";

const MILEAGE = {
  consistent: { text: "Пробіг рівний", cls: "bg-good-bg text-good" },
  inconsistent: { text: "Пробіг під сумнівом", cls: "bg-bad-bg text-bad" },
  unknown: { text: "Пробіг не перевірено", cls: "bg-warn-bg text-warn" },
};

const money = (n: number) => `$${Math.round(n).toLocaleString("uk-UA")}`;

export function HistoryMarket({
  analysis,
  comparables,
  historyFiles,
  vinHistory,
  vin,
}: {
  analysis: Analysis;
  comparables?: Comparables | null;
  historyFiles?: string[];
  vinHistory?: VinHistory | null;
  vin: string;
}) {
  const provided = analysis.historyProvided === true;
  const findings = analysis.historyFindings ?? [];
  const mileage = MILEAGE[analysis.historyMileage ?? "unknown"] ?? MILEAGE.unknown;
  const cleanedVin = cleanVin(vin);
  const stats = comparables?.stats;

  return (
    <div className="grid gap-3.5 md:grid-cols-2">
      <section className="card p-5 sm:p-6">
        <h2 className="mb-3.5 flex flex-wrap items-center gap-2.5 text-base font-extrabold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-panel2 text-accent-text">
            <History className="size-4" />
          </span>
          Історія за VIN
          {provided && (
            <span className={`ml-auto rounded-full px-2.5 py-1 text-[11px] font-bold ${mileage.cls}`}>{mileage.text}</span>
          )}
        </h2>
        {provided ? (
          <>
            {analysis.historySummary && (
              <p className="text-sm leading-relaxed text-ink/90">{analysis.historySummary}</p>
            )}
            {findings.length > 0 && (
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink/90">
                {findings.map((f, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-text" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            )}
            {vinHistory && vinHistory.auctionSales.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-line pt-3 text-xs text-muted">
                {vinHistory.auctionSales.map((s, i) => (
                  <li key={`${s.lotNumber}-${i}`}>
                    <span className="font-mono">{s.date.slice(0, 10)}</span> · {s.auction} {s.lotNumber && `лот ${s.lotNumber}`}
                    {s.damage && ` · ${s.damage}`}
                    {s.priceUsd > 0 && ` · ${money(s.priceUsd)}`}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-faint">
              Джерела: {[...(vinHistory?.sources ?? []), ...(historyFiles ?? [])].join(", ") || "—"}
            </p>
          </>
        ) : (
          <div className="text-sm text-muted">
            <p>Звіт Carfax чи AutoCheck до аналізу не додавали, тож попередні ДТП і пробіг не перевірені.</p>
            {cleanedVin.length === 17 && (
              <a
                href={`https://www.carfax.com/VehicleHistory/p/Report.cfx?vin=${cleanedVin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="no-print mt-2 inline-flex items-center gap-1.5 font-bold text-accent-text hover:underline"
              >
                Відкрити Carfax для {cleanedVin} <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
        )}
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="mb-3.5 flex items-center gap-2.5 text-base font-extrabold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-panel2 text-accent-text">
            <BarChart3 className="size-4" />
          </span>
          Продажі схожих лотів
        </h2>
        {stats ? (
          <>
            <p className="text-3xl font-extrabold tracking-tight">{money(stats.medianUsd)}</p>
            <p className="mt-1 text-sm text-muted">медіана фінальної ставки на аукціонах США</p>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Середина ринку</dt>
                <dd className="font-bold">{money(stats.p25Usd)}–{money(stats.p75Usd)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Розкид</dt>
                <dd className="font-bold">{money(stats.minUsd)}–{money(stats.maxUsd)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Продажів</dt>
                <dd className="font-bold">{stats.count}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-faint">
              {comparables!.query} · {comparables!.source}. Ціни лотів з різними пошкодженнями, тож це орієнтир, а не оцінка цього авто.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">
            Даних про продажі схожих лотів немає. Вони з’являються, коли лот знайдено через «Знайти лот» з підключеним постачальником даних.
          </p>
        )}
      </section>
    </div>
  );
}
