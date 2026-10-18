"use client";

import { ArrowLeft, Copy, Link2, Power, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuditList, stamp, type AuditEntry } from "@/components/AuditList";
import { Button, Notice, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { PLANS, isPlanId } from "@/lib/plans";
import { ROLE_LABEL, type Role } from "@/lib/roles";

interface Detail {
  company: { id: string; name: string; kind: "team" | "personal"; plan: string; credits: number; seats: number; period_end: string | null; recurring_active: boolean; suspended: boolean; suspended_reason: string; created_at: string };
  members: { id: string; name: string; email: string; role: Role; active: boolean; google: boolean; created_at: string; analyses: string; reports: string; last_seen: string | null }[];
  invites: { role: string; expires_at: string }[];
  payments: { order_reference: string; plan: string; amount: string; method: string; status: string; created_at: string; paid_at: string | null }[];
  log: AuditEntry[];
  stats: { month: string; analyses: string; unlocks: string; reports: string; pdfs: string };
  seatUsage: { total: number; active: number; pending: number; free: number };
}

const STATUS: Record<string, string> = { approved: "Оплачено", pending: "Очікує", declined: "Відхилено", refunded: "Повернено" };
const uah = (n: number | string) => `${Number(n).toLocaleString("uk-UA")} грн`;

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [role, setRole] = useState("manager");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [reason, setReason] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    let alive = true;
    api<Detail>(`/api/admin/company/${id}`)
      .then((x) => {
        if (!alive) return;
        setD(x);
        setName(x.company.name);
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [id, version]);

  const reload = () => setVersion((v) => v + 1);

  async function member(body: Record<string, unknown>) {
    setError("");
    try {
      const r = await api<{ url?: string }>(`/api/admin/company/${id}`, { body });
      if (r.url) {
        setLink(r.url);
        setCopied(false);
      }
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося.");
    }
  }

  async function company(body: Record<string, unknown>) {
    setError("");
    try {
      await api("/api/admin", { body: { companyId: id, ...body } });
      reload();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося.");
      return false;
    }
  }

  if (error && !d) {
    return (
      <Notice tone="bad" title="Помилка">
        {error}
      </Notice>
    );
  }
  if (!d) return <p className="text-sm text-muted">Завантажую…</p>;
  const c = d.company;
  const team = c.kind === "team";

  return (
    <div>
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Консоль
      </Link>
      <PageHeader
        title={c.name}
        description={`${team ? "Компанія" : "Особистий акаунт"} · тариф ${isPlanId(c.plan) ? PLANS[c.plan].name : c.plan}${c.period_end && new Date(c.period_end) > new Date() ? ` до ${new Date(c.period_end).toLocaleDateString("uk-UA")}` : ""} · створено ${new Date(c.created_at).toLocaleDateString("uk-UA")}`}
      />
      {error && (
        <div className="mb-5">
          <Notice tone="bad" title="Помилка">
            {error}
          </Notice>
        </div>
      )}
      {c.suspended && (
        <div className="mb-5">
          <Notice tone="bad" title="Доступ призупинено">
            {c.suspended_reason || "Причину не вказано."}
          </Notice>
        </div>
      )}

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["Залишок аналізів", c.credits],
          ["Аналізів за місяць", d.stats.analyses],
          ["Відкрито лотів", d.stats.unlocks],
          ["Збережених звітів", d.stats.reports],
          ["PDF за місяць", d.stats.pdfs],
        ].map(([label, value]) => (
          <div key={String(label)} className="card p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <section className="card mb-5 p-5 sm:p-6">
        <h2 className="text-lg font-extrabold">Керування</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="min-w-56 flex-1">
            <span className="mb-1.5 block text-[13px] font-bold text-ink/80">Назва</span>
            <input className="control" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <Button variant="secondary" disabled={!name.trim() || name.trim() === c.name} onClick={() => company({ action: "rename", name })}>
            Зберегти
          </Button>
          {team && (
            <label className="w-28">
              <span className="mb-1.5 block text-[13px] font-bold text-ink/80">Місць</span>
              <input
                className="control"
                type="number"
                min={1}
                defaultValue={c.seats}
                key={c.seats}
                onBlur={(e) => Number(e.target.value) >= 1 && Number(e.target.value) !== c.seats && company({ action: "setSeats", seats: Number(e.target.value) })}
              />
            </label>
          )}
        </div>
        <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-line pt-5">
          {c.suspended ? (
            <Button onClick={() => company({ action: "resume" })}>Відновити доступ</Button>
          ) : (
            <>
              <label className="min-w-56 flex-1">
                <span className="mb-1.5 block text-[13px] font-bold text-ink/80">Причина (побачить клієнт)</span>
                <input className="control" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Наприклад: прострочено оплату" />
              </label>
              <Button variant="secondary" onClick={() => window.confirm("Відрубити доступ усієї компанії? Усі користувачі одразу вийдуть з акаунтів.") && company({ action: "suspend", reason })}>
                <Power className="size-4" /> Відрубити доступ
              </Button>
            </>
          )}
          {team && (
            <Button
              variant="secondary"
              onClick={async () => {
                if (window.confirm(`Видалити компанію «${c.name}» разом з користувачами, звітами й журналом? Відновити не вдасться.`) && (await company({ action: "deleteCompany" }))) router.replace("/admin");
              }}
            >
              <Trash2 className="size-4" /> Видалити компанію
            </Button>
          )}
        </div>
      </section>

      <section className="card mb-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold">Користувачі</h2>
          <p className="text-sm text-muted">
            Місць: {d.seatUsage.active + d.seatUsage.pending} з {d.seatUsage.total} (запрошень: {d.seatUsage.pending})
          </p>
        </div>
        {team && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="w-60">
              <span className="mb-1.5 block text-[13px] font-bold text-ink/80">Роль</span>
              <select className="control" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="admin">{ROLE_LABEL.admin}</option>
                <option value="manager">{ROLE_LABEL.manager}</option>
                <option value="expert">{ROLE_LABEL.expert}</option>
              </select>
            </label>
            <Button onClick={() => member({ action: "invite", role })}>
              <Link2 className="size-4" /> Додати користувача
            </Button>
            {d.invites.length > 0 && (
              <button type="button" onClick={() => member({ action: "cancelInvites" })} className="text-sm font-bold text-bad hover:underline">
                Скасувати запрошення ({d.invites.length})
              </button>
            )}
          </div>
        )}
        {link && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-line2 bg-paper p-3">
            <code className="min-w-0 flex-1 truncate text-sm">{link}</code>
            <Button
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              }}
            >
              <Copy className="size-4" /> {copied ? "Скопійовано" : "Копіювати"}
            </Button>
          </div>
        )}
        <ul className="mt-4 divide-y divide-line">
          {d.members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className={`block font-bold ${m.active ? "" : "text-muted line-through"}`}>{m.name}</span>
                <span className="block truncate text-sm text-muted">
                  {m.email}
                  {m.google && " · Google"} · остання дія {stamp(m.last_seen)}
                </span>
              </span>
              <span className="text-right text-xs text-muted">
                <span className="block text-base font-extrabold tabular-nums text-ink">{m.analyses}</span>
                лотів / міс. · звітів {m.reports}
              </span>
              {team ? (
                <select className="control !min-h-9 !w-auto !py-1" aria-label={`Роль: ${m.name}`} value={m.role} onChange={(e) => member({ action: "role", userId: m.id, role: e.target.value })}>
                  <option value="admin">{ROLE_LABEL.admin}</option>
                  <option value="manager">{ROLE_LABEL.manager}</option>
                  <option value="expert">{ROLE_LABEL.expert}</option>
                </select>
              ) : (
                <span className="rounded-full bg-panel2 px-3 py-1 text-xs font-bold">{ROLE_LABEL[m.role]}</span>
              )}
              <button
                type="button"
                aria-label={m.active ? `Вимкнути доступ: ${m.name}` : `Увімкнути доступ: ${m.name}`}
                onClick={() => member({ action: m.active ? "deactivate" : "activate", userId: m.id })}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-extrabold ${m.active ? "border-good bg-good-bg text-good" : "border-line2 text-muted"}`}
              >
                <Power className="size-3.5" /> {m.active ? "Активний" : "Вимкнений"}
              </button>
              <button
                type="button"
                aria-label={`Видалити ${m.name}`}
                onClick={() => window.confirm(`Видалити ${m.name}?`) && member({ action: "remove", userId: m.id })}
                className="grid size-9 place-items-center rounded-full text-muted hover:bg-bad-bg hover:text-bad"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <h2 className="mb-3 text-lg font-extrabold">Оплати й рахунки</h2>
      {d.payments.length === 0 ? (
        <p className="mb-6 text-sm text-muted">Оплат ще не було.</p>
      ) : (
        <div className="card mb-6 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <tbody>
              {d.payments.map((p) => (
                <tr key={p.order_reference} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3">{new Date(p.paid_at ?? p.created_at).toLocaleDateString("uk-UA")}</td>
                  <td className="px-4 py-3 font-semibold">{isPlanId(p.plan) ? PLANS[p.plan].name : p.plan}</td>
                  <td className="px-4 py-3 text-muted">{p.method === "card" ? "Картка" : p.method === "invoice" ? "Рахунок" : "Вручну"}</td>
                  <td className="px-4 py-3 tabular-nums">{uah(p.amount)}</td>
                  <td className="px-4 py-3">{STATUS[p.status] ?? p.status}</td>
                  <td className="px-4 py-3 text-xs text-muted">{p.order_reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 text-lg font-extrabold">Журнал компанії</h2>
      <div className="card overflow-hidden">
        <AuditList entries={d.log} />
      </div>
    </div>
  );
}
