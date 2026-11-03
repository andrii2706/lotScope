"use client";

import { useCostSettings } from "@/lib/client/rates";
import { confirmDialog, PageHeader } from "@/components/ui";
import { CarFront, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AUCTIONS } from "@/lib/shared/auctions";
import { calculate, usd } from "@/lib/shared/calc";
import { TONE_BG, TONE_TEXT, VERDICT, lotTitle } from "@/lib/shared/labels";
import { useCan, useMe } from "@/lib/client/me";
import { deleteReport, useHydrated, useReports } from "@/lib/client/store";
import type { Report } from "@/types/report";
import { DAY, startOfDay } from "@/lib/shared/time";
import { StatTile } from "@/components/ui/StatTile";

export default function HistoryPage() {
  const hydrated = useHydrated();
  const reports = useReports();
  const settings = useCostSettings();
  const me = useMe();
  const lead = me.status === "ready" && me.user?.role === "lead";
  const canSeeAll = useCan("reportsAll") || lead;
  const canAnalyze = useCan("analyze");
  const canSearch = useCan("search");
  const myId = me.status === "ready" ? me.user?.id : undefined;
  const [query, setQuery] = useState("");

  const rows = useMemo(
    () =>
      reports.map((report) => ({
        report,
        cost: calculate(report.lot, settings, report.overrides, {
          min: report.analysis.repairMinUsd,
          max: report.analysis.repairMaxUsd,
        }),
      })),
    [reports, settings],
  );

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const real = rows.filter((r) => !r.report.demo);
    const at = (r: Report) => Date.parse(r.createdAt);
    const month = real.filter((r) => at(r.report) >= monthStart).length;
    const prev = real.filter((r) => at(r.report) >= prevStart && at(r.report) < monthStart).length;
    const withMarket = real.filter((r) => r.cost.marketPriceUsd > 0);
    const avgSavings = withMarket.length ? withMarket.reduce((s, r) => s + r.cost.savingsPct, 0) / withMarket.length : null;
    const awaiting = real.filter((r) => !r.report.expert).length;
    const today = startOfDay(now);
    const days = Array.from({ length: 14 }, (_, i) => {
      const from = today - (13 - i) * DAY;
      return { from, count: real.filter((r) => at(r.report) >= from && at(r.report) < from + DAY).length };
    });
    const authors = new Map<string, number>();
    for (const r of real) {
      if (at(r.report) < monthStart) continue;
      const name = r.report.authorName || "Без автора";
      authors.set(name, (authors.get(name) ?? 0) + 1);
    }
    return {
      month,
      prev,
      avgSavings,
      awaiting,
      days,
      authors: [...authors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
      monthName: now.toLocaleDateString("uk-UA", { month: "long" }),
    };
  }, [rows]);

  const q = query.trim().toLowerCase();
  const visible = q
    ? rows.filter((r) => `${lotTitle(r.report.lot)} ${r.report.lot.lotNumber} ${r.report.lot.vin} ${r.report.authorName ?? ""}`.toLowerCase().includes(q))
    : rows;

  const peak = Math.max(1, ...stats.days.map((d) => d.count));
  const diff = stats.month - stats.prev;

  return (
    <div>
      <PageHeader
        title="Звіти"
        description={lead ? `Ваші звіти та звіти менеджерів команди · ${stats.monthName}` : canSeeAll ? `Звіти всієї компанії · ${stats.monthName}` : "Ваші звіти та результати за місяць."}
        action={
          <div className="flex flex-wrap gap-2">
            {canSearch && (
              <Link
                href="/search"
                className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-line2 bg-surface px-4 text-sm font-semibold transition hover:bg-panel2"
              >
                <Search className="size-4" /> Пошук лотів
              </Link>
            )}
            {canAnalyze && (
              <Link
                href="/"
                className="inline-flex min-h-10 items-center gap-2 rounded-[10px] bg-accent px-4 text-sm font-semibold text-accent-ink transition hover:brightness-110"
              >
                <Plus className="size-4" strokeWidth={2.4} /> Новий аналіз
              </Link>
            )}
          </div>
        }
      />

      {!hydrated ? (
        <p className="text-sm text-muted">Завантажую…</p>
      ) : reports.length === 0 ? (
        <div className="card mx-auto max-w-lg px-6 py-14 text-center">
          <span className="mx-auto mb-5 grid size-12 place-items-center rounded-xl bg-panel2 text-muted">
            <CarFront className="size-6" strokeWidth={1.8} />
          </span>
          <p className="text-lg font-semibold tracking-tight">Звітів ще немає</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
            {canAnalyze ? "Проаналізуйте перший лот, і він з'явиться тут разом з ціною під ключ." : "Звіти з'являться тут, коли менеджери почнуть працювати."}
          </p>
          {canAnalyze && (
            <Link
              href="/"
              className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-[10px] bg-accent px-5 text-sm font-semibold text-accent-ink transition hover:brightness-110"
            >
              Проаналізувати лот
            </Link>
          )}
        </div>
      ) : (
        <>
          <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile label="Аналізів цього місяця" value={String(stats.month)}>
              {stats.prev > 0 || stats.month > 0 ? (
                <span className={diff >= 0 ? "text-good" : "text-muted"}>
                  {diff >= 0 ? "↑" : "↓"} {Math.abs(diff)} до минулого місяця
                </span>
              ) : (
                "поки без аналізів"
              )}
            </StatTile>
            <StatTile label="Середня вигода клієнту" value={stats.avgSavings === null ? "—" : `${Math.round(stats.avgSavings)} %`}>
              від ціни на ринку України
            </StatTile>
            <StatTile label="Без перевірки експерта СТО" value={String(stats.awaiting)}>
              {stats.awaiting > 0 ? "звіти без оцінки СТО" : "усі звіти перевірено"}
            </StatTile>
          </section>

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="card min-w-0 overflow-hidden">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                <h2 className="text-base font-semibold">Останні звіти</h2>
                <label className="relative w-full sm:w-64">
                  <span className="sr-only">Пошук звітів</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
                  <input
                    type="search"
                    className="control !min-h-9 !pl-9 !text-sm"
                    placeholder="Марка, лот, VIN або автор"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              </header>
              {visible.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted">
                  Нічого не знайдено за запитом «{query}».{" "}
                  <button type="button" className="font-semibold text-accent-text hover:underline" onClick={() => setQuery("")}>
                    Скинути пошук
                  </button>
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs font-medium text-muted">
                        <th className="px-5 py-2.5 font-medium">Авто</th>
                        <th className="px-3 py-2.5 font-medium">Висновок</th>
                        <th className="px-3 py-2.5 text-right font-medium">Під ключ</th>
                        <th className="px-3 py-2.5 text-right font-medium">Вигода</th>
                        {canSeeAll && <th className="px-3 py-2.5 font-medium">Автор</th>}
                        <th className="w-12 px-3 py-2.5">
                          <span className="sr-only">Дії</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map(({ report, cost }) => {
                        const verdict = VERDICT[report.analysis.verdict];
                        const auction = report.lot.auction === "Other" ? null : AUCTIONS[report.lot.auction];
                        const hasMarket = cost.marketPriceUsd > 0;
                        return (
                          <tr key={report.id} className="group border-b border-line last:border-b-0 hover:bg-panel2/60">
                            <td className="px-5 py-3">
                              <Link href={`/report/${report.id}`} className="flex items-center gap-3">
                                {report.photos[0] ? (
                                  <img src={report.photos[0]} alt="" className="h-10 w-14 shrink-0 rounded-md object-cover" />
                                ) : (
                                  <span className="grid h-10 w-14 shrink-0 place-items-center rounded-md bg-panel2 text-faint">
                                    <CarFront className="size-5" strokeWidth={1.5} />
                                  </span>
                                )}
                                <span className="min-w-0">
                                  <span className="block truncate font-semibold group-hover:underline">{lotTitle(report.lot)}</span>
                                  <span className="block truncate text-xs text-muted">
                                    {[auction?.short, new Date(report.createdAt).toLocaleDateString("uk-UA"), report.demo ? "демо" : "", report.saved === false ? "не збережено" : ""]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </span>
                                </span>
                              </Link>
                            </td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_BG[verdict.tone]} ${TONE_TEXT[verdict.tone]}`}>
                                {verdict.label}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums">
                              {Math.round(cost.totalMinUsd).toLocaleString("uk-UA")} – {usd(cost.totalMaxUsd)}
                            </td>
                            <td className={`whitespace-nowrap px-3 py-3 text-right tabular-nums ${hasMarket ? (cost.savingsUsd >= 0 ? "text-good" : "text-bad") : "text-faint"}`}>
                              {hasMarket ? `${cost.savingsUsd >= 0 ? "" : "−"}${Math.abs(Math.round(cost.savingsPct))} %` : "—"}
                            </td>
                            {canSeeAll && <td className="max-w-40 truncate px-3 py-3 text-muted">{report.authorName ?? "—"}</td>}
                            <td className="px-3 py-3 text-right">
                              {(report.saved === false || report.authorId === myId) && (
                                <button
                                  type="button"
                                  aria-label={`Видалити звіт ${lotTitle(report.lot)}`}
                                  title="Видалити звіт"
                                  onClick={async () => {
                                    if (await confirmDialog({ title: "Видалити звіт?", message: `${lotTitle(report.lot)}: звіт буде видалено назавжди.`, confirmLabel: "Видалити звіт", tone: "danger" })) {
                                      deleteReport(report.id);
                                    }
                                  }}
                                  className="grid size-8 place-items-center rounded-lg text-faint transition hover:bg-bad-bg hover:text-bad"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
              <section className="card p-5">
                <h2 className="text-base font-semibold">Аналізи за 14 днів</h2>
                <p className="mt-0.5 text-xs text-muted">Усього {stats.days.reduce((s, d) => s + d.count, 0)}</p>
                <div className="mt-4 flex h-28 items-end gap-1" role="img" aria-label="Кількість аналізів за останні 14 днів">
                  {stats.days.map((d) => (
                    <div key={d.from} className="group relative flex h-full flex-1 items-end" title={`${new Date(d.from).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}: ${d.count}`}>
                      <span
                        className={`w-full rounded-t-[3px] ${d.count ? "bg-accent" : "bg-line"}`}
                        style={{ height: d.count ? `${Math.max(8, (d.count / peak) * 100)}%` : "3px" }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-faint">
                  <span>{new Date(stats.days[0].from).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}</span>
                  <span>сьогодні</span>
                </div>
              </section>

              {canSeeAll && stats.authors.length > 0 && (
                <section className="card p-5">
                  <h2 className="text-base font-semibold">Команда</h2>
                  <p className="mt-0.5 text-xs text-muted">аналізів цього місяця</p>
                  <ul className="mt-3 space-y-2.5">
                    {stats.authors.map(([name, count]) => (
                      <li key={name} className="flex items-center gap-3">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-panel2 text-xs font-semibold ring-1 ring-line">
                          {name
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((p) => p.charAt(0).toUpperCase())
                            .join("")}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
                        <span className="text-sm font-semibold tabular-nums">{count}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

