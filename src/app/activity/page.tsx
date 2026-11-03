"use client";

import { useCostSettings } from "@/lib/client/rates";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuditList } from "@/components/admin/AuditList";
import { stamp, VERDICT, TONE_TEXT, formatDate, lotTitle } from "@/lib/shared/labels";
import { Notice, PageHeader } from "@/components/ui";
import { api } from "@/lib/client/api";
import { usd, calculate } from "@/lib/shared/calc";
import { ROLE_LABEL } from "@/lib/shared/roles";
import { useHydrated, useReports } from "@/lib/client/store";
import { useMe } from "@/lib/client/me";
import { userMessage } from "@/lib/shared/errors";
import type { ActivityData } from "@/types/team";

export default function ActivityPage() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [error, setError] = useState("");
  const [user, setUser] = useState("");
  const hydrated = useHydrated();
  const reports = useReports();
  const settings = useCostSettings();
  const me = useMe();
  const lead = me.status === "ready" && me.user?.role === "lead";

  useEffect(() => {
    let alive = true;
    api<ActivityData>(`/api/activity${user ? `?user=${user}` : ""}`)
      .then((d) => alive && setData(d))
      .catch((e: unknown) => alive && setError(userMessage(e)));
    return () => {
      alive = false;
    };
  }, [user]);

  const people = data?.members.filter((m) => m.role !== "admin" && (!lead || m.id !== (me.status === "ready" ? me.user?.id : ""))) ?? [];
  const visibleReports = user ? reports.filter((r) => r.authorId === user) : reports;

  return (
    <div>
      <PageHeader
        title={lead ? "Активність моєї команди" : "Активність компанії"}
        description={lead ? "Що робили менеджери вашої команди: входи, аналізи, відкриті лоти, збережені звіти й PDF. Нижче — їхні звіти." : "Що робили люди компанії: входи, аналізи, відкриті лоти, збережені звіти й PDF. Нижче — усі звіти компанії."}
      />
      {error && (
        <div className="mb-5">
          <Notice tone="bad" title="Помилка">
            {error}
          </Notice>
        </div>
      )}

      <section className="card mb-6 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
              <th className="px-4 py-3">Людина</th>
              <th className="px-4 py-3">Остання дія</th>
              <th className="px-4 py-3">Входів</th>
              <th className="px-4 py-3">Аналізів</th>
              <th className="px-4 py-3">Відкрито лотів</th>
              <th className="px-4 py-3">Збережено</th>
              <th className="px-4 py-3">PDF</th>
            </tr>
          </thead>
          <tbody>
            {people.map((m) => (
              <tr key={m.id} className={`border-b border-line last:border-b-0 ${user === m.id ? "bg-panel2" : ""}`}>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => setUser(user === m.id ? "" : m.id)} className="text-left">
                    <span className={`block font-bold ${m.active ? "" : "text-muted line-through"}`}>{m.name}</span>
                    <span className="text-xs text-muted">{ROLE_LABEL[m.role]}</span>
                  </button>
                </td>
                <td className="px-4 py-3 text-muted">{stamp(m.last_seen)}</td>
                <td className="px-4 py-3 tabular-nums">{m.logins}</td>
                <td className="px-4 py-3 tabular-nums font-bold">{m.analyses}</td>
                <td className="px-4 py-3 tabular-nums">{m.unlocks}</td>
                <td className="px-4 py-3 tabular-nums">{m.saved}</td>
                <td className="px-4 py-3 tabular-nums">{m.pdfs}</td>
              </tr>
            ))}
            {data && people.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted">
                  У команді ще немає менеджерів. Запросіть їх на сторінці «Команда».
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="border-t border-line px-4 py-2 text-xs text-muted">Лічильники за поточний місяць. Натисніть на ім&apos;я, щоб відфільтрувати події та звіти.</p>
      </section>

      <h2 className="mb-3 text-lg font-semibold">Звіти {user ? "вибраної людини" : "компанії"}</h2>
      {!hydrated ? (
        <p className="mb-6 text-sm text-muted">Завантажую…</p>
      ) : visibleReports.length === 0 ? (
        <p className="mb-6 text-sm text-muted">Звітів немає.</p>
      ) : (
        <div className="card mb-6 overflow-hidden">
          <ul>
            {visibleReports.slice(0, 100).map((r) => {
              const cost = calculate(r.lot, settings, r.overrides, { min: r.analysis.repairMinUsd, max: r.analysis.repairMaxUsd });
              const verdict = VERDICT[r.analysis.verdict];
              return (
                <li key={r.id}>
                  <Link href={`/report/${r.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-4 py-3 hover:bg-panel2 sm:px-5">
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{lotTitle(r.lot)}</span>
                      <span className="text-xs text-muted">
                        {formatDate(r.createdAt)} · {r.authorName ?? "—"}
                      </span>
                    </span>
                    <span className={`text-xs font-semibold ${TONE_TEXT[verdict.tone]}`}>{verdict.label}</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {usd(cost.totalMinUsd)} – {usd(cost.totalMaxUsd)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold">Журнал подій</h2>
      <div className="card overflow-hidden">{data ? <AuditList entries={data.log} /> : <p className="p-5 text-sm text-muted">Завантажую…</p>}</div>
    </div>
  );
}
