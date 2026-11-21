"use client";

import { Button, Notice, PageHeader, Select, confirmDialog } from "@/components/ui";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuditList } from "@/components/admin/AuditList";
import { stamp } from "@/lib/shared/labels";
import { api } from "@/lib/client/api";
import { ROLE_LABEL } from "@/lib/shared/roles";
import { userMessage } from "@/lib/shared/errors";
import { InviteResultBox, PendingInvites } from "@/components/team/InviteResultBox";
import type { CompanyDetail } from "@/types/admin";
import type { InviteResult } from "@/types/team";
import { t, localeOf } from "@/lib/shared/i18n";

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [d, setD] = useState<CompanyDetail | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [role, setRole] = useState("manager");
  const [inviteEmail, setInviteEmail] = useState("");
  const [result, setResult] = useState<InviteResult | null>(null);

  useEffect(() => {
    let alive = true;
    api<CompanyDetail>(`/api/admin/company/${id}`)
      .then((x) => alive && setD(x))
      .catch((e: unknown) => alive && setError(userMessage(e)));
    return () => {
      alive = false;
    };
  }, [id, version]);

  const reload = () => setVersion((v) => v + 1);

  async function member(body: Record<string, unknown>) {
    setError("");
    try {
      const r = await api<Partial<InviteResult>>(`/api/admin/company/${id}`, { body });
      if (r.url) {
        setResult(r as InviteResult);
        setInviteEmail("");
      }
      reload();
    } catch (e) {
      setError(userMessage(e, t("Не вдалося.")));
    }
  }

  async function company(body: Record<string, unknown>) {
    setError("");
    try {
      await api("/api/admin", { body: { companyId: id, ...body } });
      reload();
      return true;
    } catch (e) {
      setError(userMessage(e, t("Не вдалося.")));
      return false;
    }
  }

  if (error && !d) {
    return (
      <Notice tone="bad" title={t("Помилка")}>
        {error}
      </Notice>
    );
  }
  if (!d) return <p className="text-sm text-muted">{t("Завантажую…")}</p>;
  const c = d.company;
  const team = c.kind === "team";

  return (
    <div>
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> {t("Консоль")}
      </Link>
      <PageHeader
        title={c.name}
        description={t("{v0} · створено {v1}", { v0: team ? "Компанія" : "Особистий акаунт", v1: new Date(c.created_at).toLocaleDateString(localeOf()) })}
      />
      {error && (
        <div className="mb-5">
          <Notice tone="bad" title={t("Помилка")}>
            {error}
          </Notice>
        </div>
      )}
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [t("Аналізів за місяць"), d.stats.analyses],
          [t("Відкрито лотів"), d.stats.unlocks],
          [t("Збережених звітів"), d.stats.reports],
          [t("PDF за місяць"), d.stats.pdfs],
        ].map(([label, value]) => (
          <div key={String(label)} className="card p-4">
            <p className="text-[13px] font-medium text-muted">{label}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <section className="card mb-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("Користувачі ·")} {d.members.length}</h2>
          {team && (
            <Button
              variant="secondary"
              onClick={async () => {
                if ((await confirmDialog({ title: t("Видалити компанію «{v0}»?", { v0: c.name }), message: t("Разом з компанією буде видалено користувачів, команди, звіти й журнал. Відновити не вдасться."), confirmLabel: t("Видалити компанію"), tone: "danger" })) && (await company({ action: "deleteCompany" }))) router.replace("/admin");
              }}
            >
              <Trash2 className="size-4" /> {t("Видалити компанію")}
            </Button>
          )}
        </div>
        {team && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="w-60">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">{t("Роль")}</span>
              <Select value={role} onChange={setRole} options={(["admin", "manager", "expert"] as const).map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
            </label>
            <label className="min-w-60 flex-1">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">{t("Пошта")}</span>
              <input className="control" type="email" autoComplete="off" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            </label>
            <Button
              onClick={() => {
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) return setError(t("Вкажіть пошту людини, якій надсилаєте запрошення."));
                void member({ action: "invite", role, email: inviteEmail.trim() });
              }}
            >
              <Send className="size-4" /> {t("Надіслати запрошення")}
            </Button>
          </div>
        )}
        {result && <InviteResultBox result={result} />}
        {team && <PendingInvites invites={d.invites} roleLabel={(r) => ROLE_LABEL[r as keyof typeof ROLE_LABEL] ?? r} onCancel={() => member({ action: "cancelInvites" })} />}
        <ul className="mt-4 divide-y divide-line">
          {d.members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className={`block font-semibold ${m.active ? "" : "text-muted"}`}>{m.name}</span>
                <span className="block truncate text-sm text-muted">
                  {m.email}
                  {m.google && " · Google"} {t("· остання дія")} {stamp(m.last_seen)}
                </span>
              </span>
              <span className="text-right text-xs text-muted">
                <span className="block text-base font-semibold tabular-nums text-ink">{m.analyses}</span>
                {t("лотів / міс. · звітів")} {m.reports}
              </span>
              <span className="rounded-full bg-panel2 px-3 py-1 text-xs font-medium">
                {ROLE_LABEL[m.role]}
                {m.team ? ` · ${m.team}` : ""}
              </span>
              {!m.active && <span className="rounded-full bg-warn-bg px-3 py-1 text-xs font-medium text-warn">{t("вимкнено")}</span>}
              <button
                type="button"
                aria-label={t("Видалити {v0}", { v0: m.name })}
                onClick={async () => (await confirmDialog({ title: t("Видалити {v0}?", { v0: m.name }), message: t("Профіль буде видалено, людина втратить доступ. Її звіти залишаться в компанії."), confirmLabel: t("Видалити"), tone: "danger" })) && member({ action: "remove", userId: m.id })}
                className="grid size-9 place-items-center rounded-full text-muted hover:bg-bad-bg hover:text-bad"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <h2 className="mb-3 text-lg font-semibold">{t("Журнал компанії")}</h2>
      <div className="card overflow-hidden">
        <AuditList entries={d.log} />
      </div>
    </div>
  );
}
