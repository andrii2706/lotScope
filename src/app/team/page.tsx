"use client";

import { Button, Notice, PageHeader, Select, confirmDialog } from "@/components/ui";
import { Plus, Power, Send, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { ROLE_LABEL, refreshMe, useMe } from "@/lib/client/me";
import { userMessage } from "@/lib/shared/errors";
import { InviteResultBox, PendingInvites } from "@/components/team/InviteResultBox";
import type { InviteResult, InviteRole, TeamData, TeamMember } from "@/types/team";
import { t } from "@/lib/shared/i18n";

const roleOptions = () => (["lead", "manager", "expert"] as const).map((r) => ({ value: r, label: ROLE_LABEL[r] }));

export default function TeamPage() {
  const me = useMe();
  const [data, setData] = useState<TeamData | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [role, setRole] = useState<InviteRole>("manager");
  const [inviteTeam, setInviteTeam] = useState("");
  const [teamName, setTeamName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [result, setResult] = useState<InviteResult | null>(null);

  useEffect(() => {
    let alive = true;
    api<TeamData>("/api/team")
      .then((item) => {
        if (!alive) return;
        setData(item);
        setCompanyName(item.companyName);
      })
      .catch((e: unknown) => alive && setError(userMessage(e)));
    return () => {
      alive = false;
    };
  }, [version]);

  const reload = () => setVersion((v) => v + 1);
  const myId = me.status === "ready" ? me.user?.id : undefined;
  const lead = Boolean(data?.lead);
  const teams = data?.teams ?? [];
  const teamName_ = (id: string | null) => teams.find((item) => item.id === id)?.name ?? "";

  async function call(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>) {
    setError("");
    try {
      const r = await api<Partial<InviteResult>>("/api/team", { method, body });
      reload();
      void refreshMe();
      return r;
    } catch (e) {
      setError(userMessage(e, t("Не вдалося.")));
      return null;
    }
  }

  async function invite() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) return setError(t("Вкажіть пошту людини, якій надсилаєте запрошення."));
    if (!lead && role === "lead" && !inviteTeam) return setError(t("Оберіть команду для керівника."));
    const email = inviteEmail.trim();
    const r = await call("POST", lead ? { role: "manager", email } : { role, email, teamId: role === "expert" ? null : inviteTeam || null });
    if (r?.url) {
      setResult(r as InviteResult);
      setInviteEmail("");
    }
  }

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) return setError(t("Вкажіть назву команди."));
    if (await call("POST", { action: "createTeam", name: teamName })) setTeamName("");
  }

  const canManage = (m: TeamMember) => m.id !== myId && m.role !== "admin" && (!lead || m.role === "manager");

  return (
    <div>
      <PageHeader
        title={lead ? t("Моя команда{v0}", { v0: me.status === "ready" && me.user?.teamName ? ` · ${me.user.teamName}` : "" }) : t("Команди і люди")}
        description={
          lead
            ? t("Менеджери вашої команди: запрошуйте нових, вимикайте доступ. Їхні звіти бачите в «Звітах», а дії — в «Активності».")
            : t("Створюйте команди, призначайте керівників і менеджерів. Керівник бачить звіти й дії лише своєї команди.")
        }
      />
      {error && (
        <div className="mb-5">
          <Notice tone="bad" title={t("Помилка")}>
            {error}
          </Notice>
        </div>
      )}
      {lead && data && !data.teamId && (
        <div className="mb-5">
          <Notice tone="warn" title={t("Вас ще не додали до команди")}>
            {t("Попросіть адміністратора компанії призначити вам команду.")}
          </Notice>
        </div>
      )}

      {!lead && data && (
        <section className="card mb-5 p-5 sm:p-6">
          <h2 className="text-base font-semibold">{t("Команди")}</h2>
          <form noValidate onSubmit={createTeam} className="mt-3 flex flex-wrap gap-3">
            <input className="control min-w-0 flex-1" aria-label={t("Назва нової команди")} placeholder={t("Наприклад: Львів")} value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            <Button type="submit" variant="secondary">
              <Plus className="size-4" /> {t("Створити команду")}
            </Button>
          </form>
          {teams.length === 0 ? (
            <p className="mt-4 text-sm text-muted">{t("Команд ще немає. Створіть першу, потім запросіть у неї керівника й менеджерів.")}</p>
          ) : (
            <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
              {teams.map((item) => {
                const people = data.members.filter((m) => m.team_id === item.id);
                const leads = people.filter((m) => m.role === "lead");
                return (
                  <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-panel2 text-muted">
                      <Users className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{item.name}</span>
                      <span className="block text-sm text-muted">
                        {t("Керівник:")} {leads.length ? leads.map((l) => l.name).join(", ") : t("не призначено")} {t("· менеджерів:")} {people.filter((m) => m.role === "manager").length}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label={t("Видалити команду {v0}", { v0: item.name })}
                      onClick={async () =>
                        (await confirmDialog({ title: t("Видалити команду «{v0}»?", { v0: item.name }), message: t("Люди залишаться в компанії без команди, їхні звіти збережуться."), confirmLabel: t("Видалити команду"), tone: "danger" })) &&
                        call("DELETE", { teamId: item.id })
                      }
                      className="grid size-9 place-items-center rounded-lg text-muted hover:bg-bad-bg hover:text-bad"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {data && (!lead || data.teamId) && (
        <section className="card mb-5 p-5 sm:p-6">
          <h2 className="text-base font-semibold">{lead ? t("Запросити менеджера") : t("Запросити людину")}</h2>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="w-full sm:w-72">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">{t("Пошта")}</span>
              <input
                className="control"
                type="email"
                autoComplete="off"
                aria-invalid={error.includes(t("пошту"))}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </label>
            {!lead && (
              <>
                <label className="w-full sm:w-60">
                  <span className="mb-1.5 block text-[13px] font-medium text-ink">{t("Роль")}</span>
                  <Select<InviteRole> value={role} onChange={setRole} options={roleOptions()} />
                </label>
                {role !== "expert" && (
                  <label className="w-full sm:w-60">
                    <span className="mb-1.5 block text-[13px] font-medium text-ink">{t("Команда")}{role === "lead" ? "" : t(" (за бажанням)")}</span>
                    <Select
                      value={inviteTeam}
                      onChange={setInviteTeam}
                      invalid={role === "lead" && !inviteTeam && error.includes(t("команду"))}
                      options={[{ value: "", label: role === "lead" ? t("Оберіть команду") : t("Без команди") }, ...teams.map((item) => ({ value: item.id, label: item.name }))]}
                    />
                  </label>
                )}
              </>
            )}
            <Button onClick={invite}>
              <Send className="size-4" /> {t("Надіслати запрошення")}
            </Button>
          </div>
          {result && <InviteResultBox result={result} note={t("Після входу людина одразу потрапить у потрібну команду.")} />}
          <PendingInvites
            invites={data.invites}
            roleLabel={(r) => ROLE_LABEL[r as keyof typeof ROLE_LABEL] ?? r}
            teamLabel={(item) => teamName_(item ?? null)}
            onCancel={() => call("DELETE", { invite: true })}
          />
        </section>
      )}

      <section className="card overflow-hidden">
        <header className="border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold">{t("Люди ·")} {data?.members.length ?? 0}</h2>
        </header>
        <ul>
          {data?.members.map((m) => (
            <li key={m.id} className={`flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5 last:border-b-0 ${m.active ? "" : "bg-panel2/50"}`}>
              <span className="grid size-9 place-items-center rounded-full bg-panel2 text-sm font-semibold ring-1 ring-line">{m.name.charAt(0).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className={`block font-semibold ${m.active ? "" : "text-muted"}`}>{m.name}</span>
                <span className="block truncate text-sm text-muted">
                  {m.email}
                  {m.google && " · Google"}
                </span>
              </span>
              <span className="text-right text-xs text-muted">
                <span className="block text-base font-semibold tabular-nums text-ink">{m.analyses}</span>
                {t("аналізів за місяць")}
              </span>
              {!m.active && <span className="rounded-full bg-warn-bg px-3 py-1 text-xs font-medium text-warn">{t("Доступ вимкнено")}</span>}
              {!lead && canManage(m) ? (
                <>
                  <Select
                    size="sm"
                    className="w-48"
                    label={t("Роль: {v0}", { v0: m.name })}
                    value={m.role}
                    onChange={(v) => call("PATCH", { id: m.id, role: v })}
                    options={roleOptions()}
                  />
                  <Select
                    size="sm"
                    className="w-40"
                    label={t("Команда: {v0}", { v0: m.name })}
                    value={m.team_id ?? ""}
                    onChange={(v) => call("PATCH", { id: m.id, teamId: v || null })}
                    options={[{ value: "", label: t("Без команди") }, ...teams.map((item) => ({ value: item.id, label: item.name }))]}
                  />
                </>
              ) : (
                <span className="rounded-full bg-panel2 px-3 py-1 text-xs font-medium">
                  {ROLE_LABEL[m.role]}
                  {!lead && m.team_id ? ` · ${teamName_(m.team_id)}` : ""}
                </span>
              )}
              {canManage(m) && (
                <>
                  <button
                    type="button"
                    aria-label={m.active ? t("Вимкнути доступ: {v0}", { v0: m.name }) : t("Увімкнути доступ: {v0}", { v0: m.name })}
                    aria-pressed={m.active}
                    onClick={async () =>
                      m.active
                        ? (await confirmDialog({ title: t("Вимкнути доступ для {v0}?", { v0: m.name }), message: t("Людина одразу вийде з акаунта. Доступ можна повернути пізніше."), confirmLabel: t("Вимкнути доступ"), tone: "danger" })) && call("PATCH", { id: m.id, active: false })
                        : call("PATCH", { id: m.id, active: true })
                    }
                    className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold ${m.active ? "border-good bg-good-bg text-good" : "border-line2 text-muted"}`}
                  >
                    <Power className="size-3.5" /> {m.active ? t("Активний") : t("Увімкнути")}
                  </button>
                  <button
                    type="button"
                    aria-label={t("Видалити {v0}", { v0: m.name })}
                    onClick={async () => (await confirmDialog({ title: t("Видалити {v0}?", { v0: m.name }), message: t("Профіль буде видалено, людина втратить доступ. Її звіти залишаться в компанії."), confirmLabel: t("Видалити"), tone: "danger" })) && call("DELETE", { id: m.id })}
                    className="grid size-9 place-items-center rounded-full text-muted hover:bg-bad-bg hover:text-bad"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      {!lead && data && (
        <section className="card mt-5 p-5 sm:p-6">
          <h2 className="text-base font-semibold">{t("Назва компанії")}</h2>
          <form
            noValidate
            className="mt-3 flex flex-wrap gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void call("PATCH", { companyName });
            }}
          >
            <input className="control min-w-0 flex-1" aria-label={t("Назва компанії")} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            <Button type="submit" variant="secondary" disabled={!companyName.trim() || companyName.trim() === data.companyName}>
              {t("Зберегти")}
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}
