"use client";

import { auctionLotUrl, isAuctionName } from "@/lib/shared/auctions";
import { LoaderCircle, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { parseLotQuery } from "@/lib/shared/auction";
import { Button, Notice, OutLink } from "@/components/ui";
import { FEATURES } from "@/config/features";
import { userMessage, responseMessage } from "@/lib/shared/errors";
import type { LotLookupResponse } from "@/types/auction";

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

  async function run(input: string) {
    if (!input.trim() || busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/lot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: input }),
      });
      const data = (await res.json().catch(() => null)) as (LotLookupResponse & { error?: string }) | null;
      if (!res.ok || !data || data.error) throw new Error(responseMessage("/api/lot", res.status, data, "Не вдалося знайти лот."));
      setResult(data);
      if (data.found) {
        await onFound(data);
      }
    } catch (err) {
      setError(userMessage(err, "Не вдалося знайти лот."));
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
    const known = isAuctionName(auction) ? auction : undefined;
    const initial = lot
      ? known === "CopartCanada" || known === "CopartFinland"
        ? auctionLotUrl(known, lot)
        : known === "Emirates"
          ? `emiratesauction lot ${lot}`
          : `${known ? `${known} ` : ""}lot ${lot}`
      : vin || "";
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
          <h2 className="text-lg font-semibold leading-tight tracking-tight">Знайти лот</h2>
          <p className="mt-1 text-sm text-muted">
            {FEATURES.vinHistoryAuto ? "Вставте посилання Copart чи IAAI, номер лота або VIN: дані, фото та історія за VIN підтягнуться самі." : "Вставте посилання Copart чи IAAI, номер лота або VIN: дані й фото лота підтягнуться самі."}
          </p>
        </div>
      </header>

      <form onSubmit={search} noValidate className="flex flex-col gap-2.5 sm:flex-row">
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
          {result.found ? (
            <Notice tone="good" title={car ? `Знайдено: ${car}` : "Лот знайдено"}>
              Поля форми заповнено
              {result.photos && result.photos.length > 0 ? `, додано фото: ${result.photos.length}` : ", фото не вдалося завантажити"}
              . Перевірте дані перед аналізом.
              {result.lastSale && result.lastSale.priceUsd > 0 && (
                <> Останній продаж: {usd(result.lastSale.priceUsd)}{result.lastSale.date ? `, ${result.lastSale.date.slice(0, 10)}` : ""}.</>
              )}
            </Notice>
          ) : !result.configured ? (
            <Notice tone="warn" title="Автозаповнення недоступне">
              Відкрийте лот за посиланнями нижче й перенесіть дані вручну.
            </Notice>
          ) : (
            <Notice tone="warn" title="Не знайдено автоматично">
              {result.message || "Цей лот не знайдено."}
            </Notice>
          )}

          {stats && (
            <div className="rounded-xl border border-line2 bg-paper p-4">
              <p className="text-[13px] font-medium text-muted">
                Продажі схожих лотів · {result.comparables!.query}
              </p>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                <p className="text-2xl font-semibold tracking-tight">{usd(stats.medianUsd)}</p>
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
                    <p className="mb-1.5 text-[13px] font-medium text-muted">{g.label}</p>
                    <ul className="space-y-1">
                      {links.map((l) => (
                        <li key={l.href}>
                          <OutLink link={l} className="inline-flex items-center gap-1.5 text-sm font-bold text-accent-text hover:underline" />
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
          {result.links.some((l) => l.group === "history") && (
            <p className="text-xs text-faint">
              Під час кліку VIN копіюється автоматично: вставте його в поле на сайті. carVertical і ClearVIN працюють з України. Carfax і AutoCheck з України не відкриваються, лише через VPN (США). {FEATURES.vinHistoryAuto ? "Історія за VIN у кроці 5 форми підтягується автоматично і без цих сайтів." : "Завантажений звіт додайте в кроці 5 форми: ШІ врахує його, а файл збережеться у звіті."}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
