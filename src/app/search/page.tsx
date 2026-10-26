"use client";

import { Combobox } from "@/components/Combobox";
import { MAKES, modelsFor } from "@/lib/cars";
import { ArrowRight, CarFront, ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, Search, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button, Field, Notice, NumberInput, PageHeader, Segmented } from "@/components/ui";
import { usd } from "@/lib/calc";
import { type ActiveLot, DAMAGE_FILTERS, type SearchFilters, type SearchResponse } from "@/lib/search";

const INITIAL: SearchFilters = {
  make: "",
  model: "",
  yearFrom: 0,
  yearTo: 0,
  maxMiles: 0,
  maxBidUsd: 0,
  auction: "all",
  damages: [],
  excludeFlood: true,
  excludeDeployed: false,
  runDriveOnly: false,
};

function auctionTime(iso: string): { date: string; left: string } {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return { date: iso || "дата невідома", left: "" };
  const date = new Date(t).toLocaleString("uk-UA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const diff = t - Date.now();
  if (diff <= 0) return { date, left: "торги йдуть" };
  const hours = Math.floor(diff / 3600_000);
  const left = hours < 24 ? `через ${hours} год ${Math.floor((diff % 3600_000) / 60_000)} хв` : `через ${Math.floor(hours / 24)} дн.`;
  return { date, left };
}

function analyzeHref(lot: ActiveLot): string {
  const params = new URLSearchParams();
  if (lot.lotNumber) {
    params.set("lot", lot.lotNumber);
    if (lot.auction !== "Other") params.set("auction", lot.auction);
  } else if (lot.vin) {
    params.set("vin", lot.vin);
  }
  return `/?${params.toString()}`;
}

function RunBadge({ status }: { status: string }) {
  if (!status) return null;
  const s = status.toLowerCase();
  const cls = s.includes("run") ? "bg-good-bg text-good" : s.includes("start") && !s.includes("not") ? "bg-warn-bg text-warn" : "bg-bad-bg text-bad";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{status}</span>;
}

export default function SearchPage() {
  const [filters, setFilters] = useState<SearchFilters>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [searchedAt, setSearchedAt] = useState(0);
  const last = useRef<{ filters: SearchFilters; loose: boolean }>({ filters: INITIAL, loose: false });

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
      if (!res.ok || !data || data.error) throw new Error(data?.error || "Не вдалося виконати пошук.");
      if (page === 1) last.current.loose = Boolean(data.loose);
      setResult((prev) => ({ ...data, comparables: page === 1 ? data.comparables : (prev?.comparables ?? null) }));
      setSearchedAt(Date.now());
      if (page > 1) window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося виконати пошук.");
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
            <span className="size-1.5 rounded-full bg-accent" /> Copart + IAAI · активні торги
          </>
        }
        title="Пошук лотів"
        description="Задайте авто, яке шукає клієнт. Лоти з обох аукціонів в одному списку, поруч із ціною продажів схожих авто. Будь-який лот відправляється на ШІ-аналіз одним кліком."
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
          <Segmented
            className="w-full sm:w-72"
            label="Аукціон"
            value={filters.auction}
            onChange={(v) => set("auction", v)}
            options={[
              { value: "all", label: "Усі" },
              { value: "Copart", label: "Copart" },
              { value: "IAAI", label: "IAAI" },
            ]}
          />
          <div className="min-w-0 flex-1">
            <span className="mb-1.5 block text-[13px] font-bold text-ink/80">Пошкодження</span>
            <div className="flex flex-wrap gap-1.5">
              {DAMAGE_FILTERS.map((d) => {
                const on = filters.damages.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDamage(d)}
                    className={`inline-flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-bold transition ${
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
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" className="size-4.5 accent-[var(--accent)]" checked={filters.excludeFlood} onChange={(e) => set("excludeFlood", e.target.checked)} />
            Без Water/Flood
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" className="size-4.5 accent-[var(--accent)]" checked={filters.excludeDeployed} onChange={(e) => set("excludeDeployed", e.target.checked)} />
            Без спрацьованих подушок
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
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
          <Notice tone="warn" title="Список лотів вимкнений">
            Щоб бачити активні лоти Copart та IAAI просто тут, додайте AUCTION_API_KEY у .env.local
            (ліцензований постачальник аукціонних даних). Поки що відкрийте пошук на сайтах аукціонів.
          </Notice>
          <div className="flex flex-wrap gap-2">
            {result.links.map((l) => (
              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line2 bg-surface px-4 text-sm font-bold hover:bg-panel2">
                {l.label} <ExternalLink className="size-3.5" />
              </a>
            ))}
          </div>
        </div>
      )}

      {result?.configured && (
        <>
          <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <div className="card p-4 sm:p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Знайдено</p>
              <p className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
                {result.total} <span className="font-sans text-sm font-semibold text-muted">лотів на сторінці</span>
              </p>
            </div>
            <div className="card p-4 sm:p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Торги за добу</p>
              <p className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{today}</p>
            </div>
            <div className="card col-span-2 p-4 sm:p-5 lg:col-span-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Медіана продажів схожих</p>
              {result.comparables ? (
                <>
                  <p className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{usd(result.comparables.medianUsd)}</p>
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
            <p className="mt-5 text-sm text-muted">
              Пошук і список лотів безкоштовні. Деталі лота наживо, фото, історія за VIN і звіт відкриваються за 1 аналіз.
            </p>
          )}

          {lots.length > 0 && (
            <section className="card mt-3 overflow-hidden">
              <ul>
                {lots.map((lot, i) => {
                  const time = auctionTime(lot.auctionDate);
                  const title = [lot.year || "", lot.make, lot.model].filter(Boolean).join(" ");
                  return (
                    <li key={`${lot.auction}-${lot.lotNumber}-${i}`} className="grid gap-4 border-b border-line p-4 last:border-b-0 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:p-5 lg:grid-cols-[8.5rem_minmax(0,2fr)_minmax(0,1.1fr)_minmax(0,1fr)_11rem] lg:items-center">
                      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-line bg-panel2 sm:w-34">
                        {lot.photo ? (
                          <img src={lot.photo} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" />
                        ) : (
                          <span className="grid size-full place-items-center text-faint">
                            <CarFront className="size-8" />
                          </span>
                        )}
                        <span className={`absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-extrabold text-white ${lot.auction === "Copart" ? "bg-[#2a6df4]" : "bg-[#d4352a]"}`}>
                          {lot.auction}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-extrabold tracking-tight">{title || "Авто"}</p>
                        <p className="mt-0.5 truncate font-mono text-xs text-muted">
                          {lot.lotNumber && `Лот ${lot.lotNumber}`}
                          {lot.vin && ` · ${lot.vin}`}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {[...new Set([lot.primaryDamage, lot.secondaryDamage, lot.titleType].filter(Boolean))].map((t) => (
                            <span key={t} className="rounded-full bg-panel2 px-2.5 py-0.5 text-xs font-bold text-ink/85">
                              {t}
                            </span>
                          ))}
                          <RunBadge status={lot.runStatus} />
                        </div>
                      </div>
                      <div className="text-sm">
                        <p className="text-xs font-bold text-faint">Пробіг · локація</p>
                        <p className="font-bold">{lot.odometer ? `${lot.odometer.toLocaleString("uk-UA")} mi` : "—"}</p>
                        <p className="text-muted">{lot.location || "—"}</p>
                      </div>
                      <div className="text-sm">
                        <p className="text-xs font-bold text-faint">Торги · ставка</p>
                        <p className="font-bold">{time.date}</p>
                        {time.left && <p className="font-bold text-warn">{time.left}</p>}
                        <p className="mt-1 font-display text-lg font-semibold">{lot.currentBidUsd ? usd(lot.currentBidUsd) : "—"}</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
                        <Link href={analyzeHref(lot)} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-accent text-sm font-extrabold text-accent-ink transition hover:brightness-110">
                          Відкрити лот <ArrowRight className="size-4" />
                        </Link>
                        {lot.url && (
                          <a href={lot.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-line2 text-[13px] font-bold text-ink/85 hover:bg-panel2">
                            Відкрити на {lot.auction} <ExternalLink className="size-3.5" />
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {(result.totalPages ?? 1) > 1 && (
            <nav aria-label="Сторінки" className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Button type="button" variant="secondary" disabled={busy || (result.page ?? 1) <= 1} onClick={() => load((result.page ?? 1) - 1)}>
                <ChevronLeft className="size-4.5" /> Назад
              </Button>
              <span className="text-sm font-bold text-muted">
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
