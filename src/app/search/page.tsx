"use client";

import { AUCTIONS, SEARCHABLE } from "@/lib/shared/auctions";
import { Combobox } from "@/components/ui/Combobox";
import { MAKES, modelsFor } from "@/lib/shared/cars";
import { ArrowRight, CarFront, ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, Search, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button, Field, Notice, NumberInput, OutLink, PageHeader, Select } from "@/components/ui";
import { usd } from "@/lib/shared/calc";
import { DAMAGE_FILTERS } from "@/lib/shared/search";
import { userMessage, responseMessage } from "@/lib/shared/errors";
import type { SearchFilters, SearchResponse } from "@/types/auction";
import { DEFAULT_SEARCH_FILTERS } from "@/config/search";
import { auctionTime, analyzeHref } from "@/lib/shared/lots";
import { RunBadge } from "@/components/search/RunBadge";

export default function SearchPage() {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_SEARCH_FILTERS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [searchedAt, setSearchedAt] = useState(0);
  const last = useRef<{ filters: SearchFilters; loose: boolean }>({ filters: DEFAULT_SEARCH_FILTERS, loose: false });

  const set = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));
  const toggleDamage = (d: string) =>
    set("damages", filters.damages.includes(d) ? filters.damages.filter((x) => x !== d) : [...filters.damages, d]);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (!filters.make.trim() || busy) return;
    last.current = { filters: { ...filters }, loose: false };
    await load(1);
  }

  async function load(page: number) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filters: last.current.filters, page, loose: last.current.loose }),
      });
      const data = (await res.json().catch(() => null)) as (SearchResponse & { error?: string }) | null;
      if (!res.ok || !data || data.error) throw new Error(responseMessage("/api/search", res.status, data, "Не вдалося виконати пошук."));
      if (page === 1) last.current.loose = Boolean(data.loose);
      setResult((prev) => ({ ...data, comparables: page === 1 ? data.comparables : (prev?.comparables ?? null) }));
      setSearchedAt(Date.now());
      if (page > 1) window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(userMessage(err, "Не вдалося виконати пошук."));
    } finally {
      setBusy(false);
    }
  }

  const lots = result?.lots ?? [];
  const today = lots.filter((l) => {
    const t = Date.parse(l.auctionDate);
    return Number.isFinite(t) && t - searchedAt < 24 * 3600_000 && t >= searchedAt - 6 * 3600_000;
  }).length;

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <span className="size-1.5 rounded-full bg-accent" /> Copart, IAAI, Copart Canada, Finland, Emirates · активні торги
          </>
        }
        title="Пошук лотів"
        description="Задайте авто, яке шукає клієнт. Лоти з аукціонів США, Канади, Фінляндії та ОАЕ в одному списку, поруч із ціною продажів схожих авто. Будь-який лот відправляється на ШІ-аналіз одним кліком."
      />

      <form onSubmit={search} noValidate className="card rise p-5 sm:p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <Field label="Марка" required>
            <Combobox options={MAKES} placeholder="BMW" value={filters.make} onChange={(v) => set("make", v)} />
          </Field>
          <Field label="Модель" className="lg:col-span-1">
            <Combobox options={modelsFor(filters.make)} placeholder="3 Series" value={filters.model} onChange={(v) => set("model", v)} />
          </Field>
          <Field label="Рік від">
            <NumberInput value={filters.yearFrom} onChange={(v) => set("yearFrom", Math.round(v))} placeholder="2018" />
          </Field>
          <Field label="Рік до">
            <NumberInput value={filters.yearTo} onChange={(v) => set("yearTo", Math.round(v))} placeholder="2020" />
          </Field>
          <Field label="Пробіг до">
            <NumberInput value={filters.maxMiles} onChange={(v) => set("maxMiles", v)} suffix="mi" placeholder="60000" />
          </Field>
          <Field label="Ставка до">
            <NumberInput value={filters.maxBidUsd} onChange={(v) => set("maxBidUsd", v)} suffix="$" placeholder="12000" />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-4 border-t border-line pt-4">
          <Field label="Аукціон" className="w-full sm:w-64">
            <Select<SearchFilters["auction"]>
              value={filters.auction}
              onChange={(v) => set("auction", v)}
              options={[{ value: "all", label: "Усі аукціони" }, ...SEARCHABLE.map((a) => ({ value: a, label: AUCTIONS[a].label }))]}
            />
          </Field>
          <div className="min-w-0 flex-1">
            <span className="mb-1.5 block text-[13px] font-medium text-ink">Пошкодження</span>
            <div className="flex flex-wrap gap-1.5">
              {DAMAGE_FILTERS.map((d) => {
                const on = filters.damages.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDamage(d)}
                    className={`inline-flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-medium transition ${
                      on ? "bg-accent text-accent-ink" : "border border-dashed border-line2 text-muted hover:text-ink"
                    }`}
                  >
                    {d}
                    {on && <X className="size-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-4.5 accent-[var(--accent)]" checked={filters.excludeFlood} onChange={(e) => set("excludeFlood", e.target.checked)} />
            Без Water/Flood
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-4.5 accent-[var(--accent)]" checked={filters.excludeDeployed} onChange={(e) => set("excludeDeployed", e.target.checked)} />
            Без спрацьованих подушок
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-4.5 accent-[var(--accent)]" checked={filters.runDriveOnly} onChange={(e) => set("runDriveOnly", e.target.checked)} />
            Лише Run &amp; Drive
          </label>
          <Button type="submit" className="ml-auto w-full sm:w-auto" disabled={busy || !filters.make.trim()}>
            {busy ? <LoaderCircle className="size-4.5 animate-spin" /> : <Search className="size-4.5" />}
            {busy ? "Шукаю…" : "Шукати лоти"}
          </Button>
        </div>
      </form>

      {error && (
        <div className="mt-5">
          <Notice tone="bad" title="Пошук не виконано">
            {error}
          </Notice>
        </div>
      )}

      {result && !result.configured && (
        <div className="mt-5 space-y-3">
          <Notice tone="warn" title="Список лотів зараз недоступний">
            Відкрийте пошук на сайтах аукціонів за посиланнями нижче.
          </Notice>
          <div className="flex flex-wrap gap-2">
            {result.links.map((l) => (
              <OutLink key={l.href} link={l} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line2 bg-surface px-4 text-sm font-medium hover:bg-panel2" />
            ))}
          </div>
        </div>
      )}

      {result?.configured && (
        <>
          <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <div className="card p-4 sm:p-5">
              <p className="text-[13px] font-medium text-muted">Знайдено</p>
              <p className="mt-1 text-2xl font-medium tracking-[-0.02em] sm:text-[28px]">
                {result.total} <span className="text-sm font-medium text-muted">лотів на сторінці</span>
              </p>
            </div>
            <div className="card p-4 sm:p-5">
              <p className="text-[13px] font-medium text-muted">Торги за добу</p>
              <p className="mt-1 text-2xl font-medium tracking-[-0.02em] sm:text-[28px]">{today}</p>
            </div>
            <div className="card col-span-2 p-4 sm:p-5 lg:col-span-1">
              <p className="text-[13px] font-medium text-muted">Медіана продажів схожих</p>
              {result.comparables ? (
                <>
                  <p className="mt-1 text-2xl font-medium tracking-[-0.02em] sm:text-[28px]">{usd(result.comparables.medianUsd)}</p>
                  <p className="text-xs text-faint">
                    середина {usd(result.comparables.p25Usd)}–{usd(result.comparables.p75Usd)} · продажів: {result.comparables.count}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted">немає даних про продажі</p>
              )}
            </div>
          </section>

          {result.message && (
            <div className="mt-5">
              <Notice tone="warn" title="Нічого не знайдено">
                {result.message}
              </Notice>
            </div>
          )}

          {lots.length > 0 && (
            <section className="card mt-5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-muted">
                      <th className="px-4 py-2.5 font-medium">Лот</th>
                      <th className="px-3 py-2.5 font-medium">Пошкодження</th>
                      <th className="px-3 py-2.5 font-medium">Пробіг · локація</th>
                      <th className="px-3 py-2.5 font-medium">Торги</th>
                      <th className="px-3 py-2.5 text-right font-medium">Ставка</th>
                      <th className="px-4 py-2.5">
                        <span className="sr-only">Дії</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lots.map((lot, i) => {
                      const time = auctionTime(lot.auctionDate);
                      const title = [lot.year || "", lot.make, lot.model].filter(Boolean).join(" ");
                      return (
                        <tr key={`${lot.auction}-${lot.lotNumber}-${i}`} className="border-b border-line align-middle last:border-b-0 hover:bg-panel2/60">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-panel2">
                                {lot.photo ? (
                                  <img src={lot.photo} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" />
                                ) : (
                                  <span className="grid size-full place-items-center text-faint">
                                    <CarFront className="size-6" />
                                  </span>
                                )}
                                <span className="absolute left-1 top-1 rounded px-1 py-px text-[10px] font-semibold text-white" style={{ background: AUCTIONS[lot.auction].color }}>
                                  {AUCTIONS[lot.auction].short}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold">{title || "Авто"}</p>
                                <p className="truncate font-mono text-xs text-muted">
                                  {lot.lotNumber && `Лот ${lot.lotNumber}`}
                                  {lot.vin && ` · ${lot.vin}`}
                                </p>
                                {lot.url && (
                                  <a href={lot.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline">
                                    на {AUCTIONS[lot.auction].short} <ExternalLink className="size-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex max-w-56 flex-wrap gap-1">
                              {[...new Set([lot.primaryDamage, lot.secondaryDamage, lot.titleType].filter(Boolean))].map((t) => (
                                <span key={t} className="rounded-full bg-panel2 px-2 py-0.5 text-xs font-medium">
                                  {t}
                                </span>
                              ))}
                              <RunBadge status={lot.runStatus} />
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-medium tabular-nums">{lot.odometer ? `${lot.odometer.toLocaleString("uk-UA")} mi` : "—"}</p>
                            <p className="max-w-44 truncate text-xs text-muted">{lot.location || "—"}</p>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            <p className="font-medium">{time.date}</p>
                            {time.left && <p className="text-xs font-medium text-warn">{time.left}</p>}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right text-base font-semibold tabular-nums">{lot.currentBidUsd ? usd(lot.currentBidUsd) : "—"}</td>
                          <td className="px-4 py-3 text-right">
                            <Link href={analyzeHref(lot)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-accent px-3.5 text-sm font-semibold text-accent-ink transition hover:brightness-110">
                              Аналіз <ArrowRight className="size-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {(result.totalPages ?? 1) > 1 && (
            <nav aria-label="Сторінки" className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Button type="button" variant="secondary" disabled={busy || (result.page ?? 1) <= 1} onClick={() => load((result.page ?? 1) - 1)}>
                <ChevronLeft className="size-4.5" /> Назад
              </Button>
              <span className="text-sm font-medium text-muted">
                Сторінка {result.page ?? 1} з {result.totalPages}
                {result.providerTotal ? ` · усього ${result.providerTotal.toLocaleString("uk-UA")}` : ""}
              </span>
              <Button type="button" variant="secondary" disabled={busy || (result.page ?? 1) >= (result.totalPages ?? 1)} onClick={() => load((result.page ?? 1) + 1)}>
                Далі <ChevronRight className="size-4.5" />
              </Button>
            </nav>
          )}
        </>
      )}

      {!result && !error && (
        <p className="mt-6 text-sm text-muted">
          Почніть з марки. Решта фільтрів за бажанням: що менше обмежень, то більше лотів.
        </p>
      )}
    </div>
  );
}
