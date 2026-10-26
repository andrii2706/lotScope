"use client";

import { confirmDialog } from "@/components/ConfirmDialog";
import { CarFront, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { calculate, usd } from "@/lib/calc";
import { TONE_TEXT, VERDICT, formatDate, lotTitle } from "@/lib/labels";
import { useCan, useMe } from "@/lib/me";
import { deleteReport, useHydrated, useReports, useSettings } from "@/lib/store";

export default function HistoryPage() {
  const hydrated = useHydrated();
  const reports = useReports();
  const settings = useSettings();
  const canSeeAll = useCan("reportsAll");
  const canSave = useCan("save");
  const canAnalyze = useCan("analyze");
  const me = useMe();
  const myId = me.status === "ready" ? me.user?.id : undefined;
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const visible = q
    ? reports.filter((r) =>
        `${lotTitle(r.lot)} ${r.lot.lotNumber} ${r.lot.vin}`.toLowerCase().includes(q),
      )
    : reports;

  return (
    <div>
      <PageHeader
        title="Історія звітів"
        description={canSeeAll ? "Звіти всієї компанії з іменем автора." : canSave ? "Ваші збережені звіти." : "Без підписки звіти можна лише переглядати, вони не зберігаються."}
        action={
          canAnalyze && (
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-accent-ink transition hover:brightness-110"
          >
            <Plus className="size-4.5" strokeWidth={2.6} /> Новий аналіз
          </Link>
          )
        }
      />

      {!hydrated ? (
        <p className="text-sm text-muted">Завантажую…</p>
      ) : reports.length === 0 ? (
        <div className="card mx-auto max-w-lg px-6 py-14 text-center">
          <span className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-panel2 text-accent-text ring-1 ring-line2">
            <CarFront className="size-7" strokeWidth={1.8} />
          </span>
          <p className="text-xl font-extrabold tracking-tight">Звітів ще немає</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
            {canAnalyze ? "Проаналізуйте перший лот, і він з'явиться тут разом з ціною під ключ." : "Звіти з'являться тут, коли менеджери почнуть працювати."}
          </p>
          {canAnalyze && (
          <Link
            href="/"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-accent-ink transition hover:brightness-110"
          >
            Проаналізувати лот
          </Link>
          )}
        </div>
      ) : (
        <>
          <label className="relative mb-5 block max-w-sm">
            <span className="sr-only">Пошук</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-faint" />
            <input
              type="search"
              className="control !bg-surface !pl-10"
              placeholder="Пошук за маркою, лотом або VIN"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          {visible.length === 0 ? (
            <p className="text-sm text-muted">
              Нічого не знайдено за запитом «{query}».{" "}
              <button type="button" className="font-bold text-accent-text hover:underline" onClick={() => setQuery("")}>
                Скинути пошук
              </button>
            </p>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((report) => {
                const verdict = VERDICT[report.analysis.verdict];
                const cost = calculate(report.lot, settings, report.overrides, {
                  min: report.analysis.repairMinUsd,
                  max: report.analysis.repairMaxUsd,
                });
                return (
                  <li
                    key={report.id}
                    className="card rise group relative overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-line2"
                  >
                    <Link href={`/report/${report.id}`} className="block">
                      <div className="relative">
                        {report.photos[0] ? (
                          <img
                            src={report.photos[0]}
                            alt=""
                            className="aspect-[16/10] w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="grid aspect-[16/10] w-full place-items-center bg-panel2 text-faint">
                            <CarFront className="size-10" strokeWidth={1.4} />
                          </div>
                        )}
                        <span className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/80 to-transparent" />
                        <span className="absolute bottom-3 left-3 flex items-center gap-1.5">
                          <span
                            className={`rounded-full bg-scrim px-2.5 py-1 text-xs font-extrabold backdrop-blur ${TONE_TEXT[verdict.tone]}`}
                          >
                            {verdict.label}
                          </span>
                          {report.demo && (
                            <span className="rounded-full bg-scrim px-2.5 py-1 text-xs font-extrabold text-white/80 backdrop-blur">
                              демо
                            </span>
                          )}
                        </span>
                        <span className="absolute bottom-3 right-3 rounded-full bg-scrim px-2.5 py-1 text-xs font-extrabold text-white backdrop-blur">
                          {report.analysis.conditionScore} / 100
                        </span>
                      </div>
                      <div className="p-4 sm:p-5">
                        <p className="text-base font-extrabold leading-snug tracking-tight">
                          {lotTitle(report.lot)}
                        </p>
                        <p className="mt-0.5 text-sm text-muted">
                          {formatDate(report.createdAt)}
                          {canSeeAll && report.authorName ? ` · ${report.authorName}` : ""}
                          {report.saved === false ? " · не збережено" : ""}
                        </p>
                        <div className="mt-3.5 border-t border-line pt-3.5">
                          <p className="text-xs font-semibold text-muted">Під ключ</p>
                          <p className="text-lg font-extrabold tracking-tight">
                            {usd(cost.totalMinUsd)} – {usd(cost.totalMaxUsd)}
                          </p>
                        </div>
                      </div>
                    </Link>
                    {(report.saved === false || report.authorId === myId) && (
                    <button
                      type="button"
                      aria-label={`Видалити звіт ${lotTitle(report.lot)}`}
                      onClick={async () => {
                        if (await confirmDialog({ title: "Видалити звіт?", message: `${lotTitle(report.lot)}: звіт буде видалено назавжди.`, confirmLabel: "Видалити звіт", tone: "danger" })) {
                          deleteReport(report.id);
                        }
                      }}
                      className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-scrim text-white backdrop-blur transition hover:bg-bad hover:text-on-ink"
                    >
                      <Trash2 className="size-4" />
                    </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
