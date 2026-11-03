"use client";

import { ExternalLink, LoaderCircle, PackageSearch } from "lucide-react";
import { useState } from "react";
import { usd } from "@/lib/shared/calc";
import { partRange, revisedRepair, toUsd } from "@/lib/shared/partsPricing";
import { updateReport } from "@/lib/client/store";
import { userMessage, responseMessage } from "@/lib/shared/errors";
import type { PartsSearch } from "@/types/pricing";
import type { Report, Settings } from "@/types/report";

const CONDITION = { used: "б/у", new: "нова", unknown: "" } as const;

function money(price: number, currency: string) {
  const sign = currency === "PLN" ? "zł" : currency === "UAH" ? "грн" : currency === "EUR" ? "€" : "$";
  return `${Math.round(price).toLocaleString("uk-UA")} ${sign}`;
}

export function PartsPrices({
  report,
  settings,
  canRun,
  canApply,
  onApply,
}: {
  report: Report;
  settings: Settings;
  canRun: boolean;
  canApply: boolean;
  onApply: (minUsd: number, maxUsd: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const replace = report.analysis.damagedParts.filter((p) => p.action === "replace");
  const search = report.partsSearch;
  if (!replace.length || report.demo) return null;

  async function run() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/parts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reportId: report.id,
          lot: { make: report.lot.make, model: report.lot.model, year: report.lot.year, vin: report.lot.vin },
          parts: replace.map((p) => p.part),
          partsPreference: settings.partsPreference,
        }),
      });
      const data = (await res.json().catch(() => null)) as { partsSearch?: PartsSearch; error?: string } | null;
      if (!res.ok || !data?.partsSearch) throw new Error(responseMessage("/api/parts", res.status, data, "Не вдалося знайти ціни запчастин."));
      updateReport(report.id, { partsSearch: data.partsSearch });
    } catch (e) {
      setError(userMessage(e, "Не вдалося знайти ціни запчастин."));
    } finally {
      setBusy(false);
    }
  }

  const ranges = search ? search.parts.map((p) => partRange(p, settings)) : [];
  const revised = search ? revisedRepair(report.analysis, ranges) : null;

  return (
    <section className="no-print mt-9">
      <div className="mb-3.5 flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h2 className="text-xl font-semibold tracking-tight">Ціни запчастин: Allegro та OLX</h2>
          <p className="mt-0.5 text-sm text-muted">
            {search
              ? `Перевірено ${new Date(search.checkedAt).toLocaleString("uk-UA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
              : `Деталей під заміну: ${replace.length}. Знайдемо актуальні оголошення й перерахуємо вилку ремонту.`}
          </p>
        </div>
        {canRun && (
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-line2 bg-surface px-4 text-sm font-bold transition hover:bg-panel2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <PackageSearch className="size-4 text-accent-text" />}
            {busy ? "Шукаю на Allegro та OLX…" : search ? "Оновити ціни" : "Знайти ціни деталей"}
          </button>
        )}
      </div>

      {busy && (
        <p role="status" className="mb-3 rounded-xl bg-panel2 px-4 py-3 text-sm text-muted">
          Шукаю оголошення для кожної деталі. Це може тривати до хвилини.
        </p>
      )}
      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-bad-bg px-4 py-3 text-sm font-bold text-bad">
          {error}
        </p>
      )}

      {search && (
        <>
          <ul className="card divide-y divide-line px-5 sm:px-6">
            {search.parts.map((p, i) => {
              const r = ranges[i];
              const ai = report.analysis.damagedParts.find((d) => d.part === p.part);
              return (
                <li key={p.part} className="py-4">
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <p className="mr-auto font-bold">{p.part}</p>
                    {ai && <span className="text-xs text-muted">оцінка ШІ {Math.round(ai.costMinUsd).toLocaleString("uk-UA")}–{usd(ai.costMaxUsd)}</span>}
                    <span className="text-[15px] font-semibold">
                      {r.found ? `${Math.round(r.minUsd).toLocaleString("uk-UA")}–${usd(r.maxUsd)}` : "не знайдено"}
                    </span>
                  </div>
                  {r.found && (
                    <p className="mt-0.5 text-xs text-muted">
                      деталь {Math.round(r.partMinUsd).toLocaleString("uk-UA")}–{usd(r.partMaxUsd)}
                      {p.offers.some((o) => o.source === "Allegro") ? ` (з доставкою з Польщі ${usd(settings.partsDeliveryPlUsd)})` : ""}
                      {` + роботи ${p.laborHoursMin}–${p.laborHoursMax} год`}
                      {p.paint ? ` + фарбування ${usd(settings.paintPerPanelUsd)}` : ""}
                    </p>
                  )}
                  {p.offers.length > 0 && (
                    <ul className="mt-2.5 space-y-1.5">
                      {p.offers.map((o) => (
                        <li key={o.url} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
                          <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${o.source === "Allegro" ? "bg-warn-bg text-warn" : "bg-good-bg text-good"}`}>
                            {o.source}
                          </span>
                          <a href={o.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 max-w-full items-center gap-1 font-semibold hover:underline">
                            <span className="truncate">{o.title || "Оголошення"}</span>
                            <ExternalLink className="size-3 shrink-0" />
                          </a>
                          <span className="ml-auto whitespace-nowrap font-bold">
                            {money(o.price, o.currency)}
                            {o.currency !== "USD" && <span className="font-semibold text-muted"> ≈ {usd(toUsd(o.price, o.currency, settings))}</span>}
                          </span>
                          {CONDITION[o.condition] && <span className="text-xs text-muted">{CONDITION[o.condition]}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {p.note && <p className="mt-2 text-xs text-muted">{p.note}</p>}
                </li>
              );
            })}
          </ul>

          {revised && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-accent-text/30 bg-accent-text/[0.06] p-4">
              <p className="mr-auto text-sm">
                <span className="font-semibold">
                  Ремонт за знайденими цінами: {Math.round(revised.minUsd).toLocaleString("uk-UA")}–{usd(revised.maxUsd)}
                </span>
                <span className="block text-xs text-muted">
                  Оцінка ШІ була {Math.round(report.analysis.repairMinUsd).toLocaleString("uk-UA")}–{usd(report.analysis.repairMaxUsd)}. Замінено ціни {revised.replaced} з {replace.length} деталей, решта лишилась як в оцінці.
                </span>
              </p>
              {canApply && (
                <button
                  type="button"
                  onClick={() => onApply(revised.minUsd, revised.maxUsd)}
                  className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink transition hover:brightness-110"
                >
                  Застосувати до розрахунку
                </button>
              )}
            </div>
          )}
          <p className="mt-2 text-xs text-faint">
            Оголошення знайдено автоматичним пошуком; ціни й наявність змінюються. Перед покупкою перевірте сумісність деталі за VIN
            (американська й європейська версії можуть відрізнятися). Злоті та гривні переведено за курсом НБУ або з налаштувань.
          </p>
        </>
      )}
    </section>
  );
}
