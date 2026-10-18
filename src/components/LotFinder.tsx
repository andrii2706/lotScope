"use client";

import { ExternalLink, Lock, LoaderCircle, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { parseLotQuery } from "@/lib/auction";
import { refreshMe } from "@/lib/me";
import type { LotLookupResponse } from "@/lib/auction";
import { Button, Notice } from "./ui";

const GROUPS: { key: "auction" | "history" | "web"; label: string }[] = [
  { key: "auction", label: "Аукціони" },
  { key: "history", label: "Історія за VIN" },
  { key: "web", label: "Інше" },
];

const usd = (n: number) => `$${Math.round(n).toLocaleString("uk-UA")}`;

export function LotFinder({
  onFound,
  disabled,
}: {
  onFound: (result: LotLookupResponse) => Promise<void> | void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LotLookupResponse | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    await run(query);
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").trim();
    if (pasted && parseLotQuery(pasted).kind !== "unknown") {
      e.preventDefault();
      setQuery(pasted);
      void run(pasted);
    }
  }

  async function run(input: string, unlock = false) {
    if (!input.trim() || busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/lot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: input, unlock }),
      });
      const data = (await res.json().catch(() => null)) as (LotLookupResponse & { error?: string }) | null;
      if (!res.ok || !data || data.error) throw new Error(data?.error || "Не вдалося знайти лот.");
      setResult(data);
      if (data.found) {
        await onFound(data);
        if (unlock) void refreshMe();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося знайти лот.");
    } finally {
      setBusy(false);
    }
  }

  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lot = params.get("lot");
    const vin = params.get("vin");
    const auction = params.get("auction");
    const initial = lot ? `${auction ? `${auction} ` : ""}lot ${lot}` : vin || "";
    if (!initial) return;
    const timer = setTimeout(() => {
      window.history.replaceState(null, "", window.location.pathname);
      setQuery(initial);
      void runRef.current(initial);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const car = result?.lot ? [result.lot.year, result.lot.make, result.lot.model].filter(Boolean).join(" ") : "";
  const stats = result?.comparables?.stats;

  return (
    <section className="card rise p-5 sm:p-7">
      <header className="mb-4 flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink">
          <Search className="size-4.5" strokeWidth={2.4} />
        </span>
        <div>
          <h2 className="text-lg font-extrabold leading-tight tracking-tight">Знайти лот</h2>
          <p className="mt-1 text-sm text-muted">
            Вставте посилання Copart чи IAAI, номер лота або VIN: дані, фото та історія за VIN підтягнуться самі.
          </p>
        </div>
      </header>

      <form onSubmit={search} className="flex flex-col gap-2.5 sm:flex-row">
        <input
          className="control flex-1"
          placeholder="https://www.copart.com/lot/… або WBA8Z9C5…"
          aria-label="Посилання, номер лота або VIN"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onPaste={onPaste}
          disabled={disabled || busy}
        />
        <Button type="submit" disabled={disabled || busy || !query.trim()}>
          {busy ? <LoaderCircle className="size-4.5 animate-spin" /> : <Search className="size-4.5" />}
          {busy ? "Шукаю…" : "Знайти"}
        </Button>
      </form>

      {error && (
        <div className="mt-4">
          <Notice tone="bad" title="Не знайдено">
            {error}
          </Notice>
        </div>
      )}

      {result && (
        <div className="mt-5 space-y-4">
          {result.locked ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line2 bg-paper px-4 py-3.5">
              <Lock className="size-5 shrink-0 text-muted" />
              <p className="min-w-0 flex-1 text-sm">
                <span className="font-extrabold">Деталі лота наживо, фото та історія за VIN доступні за тарифом.</span> Відкриття лота коштує один аналіз, і перший
                аналіз цього лота вже безкоштовний. Пошук і посилання нижче вільні.
              </p>
              {(result.credits ?? 0) > 0 ? (
                <Button onClick={() => void run(query, true)} disabled={busy}>
                  {busy ? <LoaderCircle className="size-4.5 animate-spin" /> : <Lock className="size-4" />}
                  Відкрити за 1 аналіз
                </Button>
              ) : (
                <Link href="/billing" className="inline-flex h-11 items-center rounded-xl bg-accent px-5 text-sm font-extrabold text-accent-ink hover:brightness-110">
                  Обрати тариф
                </Link>
              )}
            </div>
          ) : result.found ? (
            <Notice tone="good" title={car ? `Знайдено: ${car}` : "Лот знайдено"}>
              Поля форми заповнено
              {result.photos && result.photos.length > 0 ? `, додано фото: ${result.photos.length}` : ", фото не вдалося завантажити"}
              . Перевірте дані перед аналізом.
              {result.lastSale && result.lastSale.priceUsd > 0 && (
                <> Останній продаж: {usd(result.lastSale.priceUsd)}{result.lastSale.date ? `, ${result.lastSale.date.slice(0, 10)}` : ""}.</>
              )}
            </Notice>
          ) : !result.configured ? (
            <Notice tone="warn" title="Автозаповнення вимкнене">
              Для автоматичного пошуку додайте AUCTION_API_KEY у .env.local (ліцензований постачальник даних
              аукціонів). Поки що відкрийте лот за посиланнями нижче й перенесіть дані вручну.
            </Notice>
          ) : (
            <Notice tone="warn" title="Не знайдено автоматично">
              {result.message || "Постачальник даних не знайшов цей лот."}
            </Notice>
          )}

          {stats && (
            <div className="rounded-xl border border-line2 bg-paper p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                Продажі схожих лотів · {result.comparables!.query}
              </p>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                <p className="text-2xl font-extrabold tracking-tight">{usd(stats.medianUsd)}</p>
                <p className="text-sm text-muted">
                  середина {usd(stats.p25Usd)}–{usd(stats.p75Usd)} · продажів: {stats.count}
                </p>
              </div>
            </div>
          )}

          {result.links.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {GROUPS.map((g) => {
                const links = result.links.filter((l) => l.group === g.key);
                if (links.length === 0) return null;
                return (
                  <div key={g.key}>
                    <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">{g.label}</p>
                    <ul className="space-y-1">
                      {links.map((l) => (
                        <li key={l.href}>
                          <a
                            href={l.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-bold text-accent-text hover:underline"
                          >
                            {l.label} <ExternalLink className="size-3.5" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
