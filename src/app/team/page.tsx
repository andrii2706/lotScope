"use client";

import { Button, Notice, PageHeader, Select, confirmDialog } from "@/components/ui";
import { Copy, Link2, Plus, Power, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { ROLE_LABEL, refreshMe, useMe } from "@/lib/client/me";
import { userMessage } from "@/lib/shared/errors";
import type { InviteRole, TeamData, TeamMember } from "@/types/team";

const ROLE_OPTIONS = (["lead", "manager", "expert"] as const).map((r) => ({ value: r, label: ROLE_LABEL[r] }));

export default function TeamPage() {
  const me = useMe();
  const [data, setData] = useState<TeamData | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [role, setRole] = useState<InviteRole>("manager");
  const [inviteTeam, setInviteTeam] = useState("");
  const [teamName, setTeamName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    api<TeamData>("/api/team")
      .then((t) => {
        if (!alive) return;
        setData(t);
        setCompanyName(t.companyName);
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
  const teamName_ = (id: string | null) => teams.find((t) => t.id === id)?.name ?? "";

  async function call(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>) {
    setError("");
    try {
      const r = await api<{ url?: string }>("/api/team", { method, body });
      reload();
      void refreshMe();
      return r;
    } catch (e) {
      setError(userMessage(e, "Не вдалося."));
      return null;
    }
  }

  async function invite() {
    if (!lead && role === "lead" && !inviteTeam) return setError("Оберіть команду для керівника.");
    const r = await call("POST", lead ? { role: "manager" } : { role, teamId: role === "expert" ? null : inviteTeam || null });
    if (r?.url) {
      setLink(r.url);
      setCopied(false);
    }
  }

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) return setError("Вкажіть назву команди.");
    if (await call("POST", { action: "createTeam", name: teamName })) setTeamName("");
  }

  const canManage = (m: TeamMember) => m.id !== myId && m.role !== "admin" && (!lead || m.role === "manager");

  return (
    <div>
      <PageHeader
        title={lead ? `Моя команда${me.status === "ready" && me.user?.teamName ? ` · ${me.user.teamName}` : ""}` : "Команди і люди"}
        description={
          lead
            ? "Менеджери вашої команди: запрошуйте нових, вимикайте доступ. Їхні звіти бачите в «Звітах», а дії — в «Активності»."
            : "Створюйте команди, призначайте керівників і менеджерів. Керівник бачить звіти й дії лише своєї команди."
        }
      />
      {error && (
        <div className="mb-5">
          <Notice tone="bad" title="Помилка">
            {error}
          </Notice>
        </div>
      )}
      {lead && data && !data.teamId && (
        <div className="mb-5">
          <Notice tone="warn" title="Вас ще не додали до команди">
            Попросіть адміністратора компанії призначити вам команду.
          </Notice>
        </div>
      )}

      {!lead && data && (
        <section className="card mb-5 p-5 sm:p-6">
          <h2 className="text-base font-semibold">Команди</h2>
          <form noValidate onSubmit={createTeam} className="mt-3 flex flex-wrap gap-3">
            <input className="control min-w-0 flex-1" aria-label="Назва нової команди" placeholder="Наприклад: Львів" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            <Button type="submit" variant="secondary">
              <Plus className="size-4" /> Створити команду
            </Button>
          </form>
          {teams.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Команд ще немає. Створіть першу, потім запросіть у неї керівника й менеджерів.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
              {teams.map((t) => {
                const people = data.members.filter((m) => m.team_id === t.id);
                const leads = people.filter((m) => m.role === "lead");
                return (
                  <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-panel2 text-muted">
                      <Users className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{t.name}</span>
                      <span className="block text-sm text-muted">
                        Керівник: {leads.length ? leads.map((l) => l.name).join(", ") : "не призначено"} · менеджерів: {people.filter((m) => m.role === "manager").length}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Видалити команду ${t.name}`}
                      onClick={async () =>
                        (await confirmDialog({ title: `Видалити команду «${t.name}»?`, message: "Люди залишаться в компанії без команди, їхні звіти збережуться.", confirmLabel: "Видалити команду", tone: "danger" })) &&
                        call("DELETE", { teamId: t.id })
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
          <h2 className="text-base font-semibold">{lead ? "Запросити менеджера" : "Запросити людину"}</h2>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            {!lead && (
              <>
                <label className="w-full sm:w-60">
                  <span className="mb-1.5 block text-[13px] font-medium text-ink">Роль</span>
                  <Select<InviteRole> value={role} onChange={setRole} options={ROLE_OPTIONS} />
                </label>
                {role !== "expert" && (
                  <label className="w-full sm:w-60">
                    <span className="mb-1.5 block text-[13px] font-medium text-ink">Команда{role === "lead" ? "" : " (за бажанням)"}</span>
                    <Select
                      value={inviteTeam}
                      onChange={setInviteTeam}
                      invalid={role === "lead" && !inviteTeam && error.includes("команду")}
                      options={[{ value: "", label: role === "lead" ? "Оберіть команду" : "Без команди" }, ...teams.map((t) => ({ value: t.id, label: t.name }))]}
                    />
                  </label>
                )}
              </>
            )}
            <Button onClick={invite}>
              <Link2 className="size-4" /> Створити посилання
            </Button>
          </div>
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
              <p className="w-full text-xs text-muted">Посилання одноразове і діє 7 днів. Людина зареєструється паролем або через Google і одразу потрапить у потрібну команду.</p>
            </div>
          )}
          {data.invites.length > 0 && (
            <p className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
              Відкритих запрошень: {data.invites.length}
              <button type="button" onClick={() => call("DELETE", { invite: true })} className="font-semibold text-bad hover:underline">
                Скасувати всі
              </button>
            </p>
          )}
        </section>
      )}

      <section className="card overflow-hidden">
        <header className="border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold">Люди · {data?.members.length ?? 0}</h2>
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
                аналізів за місяць
              </span>
              {!m.active && <span className="rounded-full bg-warn-bg px-3 py-1 text-xs font-medium text-warn">Доступ вимкнено</span>}
              {!lead && canManage(m) ? (
                <>
                  <Select
                    size="sm"
                    className="w-48"
                    label={`Роль: ${m.name}`}
                    value={m.role}
                    onChange={(v) => call("PATCH", { id: m.id, role: v })}
                    options={ROLE_OPTIONS}
                  />
                  <Select
                    size="sm"
                    className="w-40"
                    label={`Команда: ${m.name}`}
                    value={m.team_id ?? ""}
                    onChange={(v) => call("PATCH", { id: m.id, teamId: v || null })}
                    options={[{ value: "", label: "Без команди" }, ...teams.map((t) => ({ value: t.id, label: t.name }))]}
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
                    aria-label={m.active ? `Вимкнути доступ: ${m.name}` : `Увімкнути доступ: ${m.name}`}
                    aria-pressed={m.active}
                    onClick={async () =>
                      m.active
                        ? (await confirmDialog({ title: `Вимкнути доступ для ${m.name}?`, message: "Людина одразу вийде з акаунта. Доступ можна повернути пізніше.", confirmLabel: "Вимкнути доступ", tone: "danger" })) && call("PATCH", { id: m.id, active: false })
                        : call("PATCH", { id: m.id, active: true })
                    }
                    className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold ${m.active ? "border-good bg-good-bg text-good" : "border-line2 text-muted"}`}
                  >
                    <Power className="size-3.5" /> {m.active ? "Активний" : "Увімкнути"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Видалити ${m.name}`}
                    onClick={async () => (await confirmDialog({ title: `Видалити ${m.name}?`, message: "Профіль буде видалено, людина втратить доступ. Її звіти залишаться в компанії.", confirmLabel: "Видалити", tone: "danger" })) && call("DELETE", { id: m.id })}
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
          <h2 className="text-base font-semibold">Назва компанії</h2>
          <form
            noValidate
            className="mt-3 flex flex-wrap gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void call("PATCH", { companyName });
            }}
          >
            <input className="control min-w-0 flex-1" aria-label="Назва компанії" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            <Button type="submit" variant="secondary" disabled={!companyName.trim() || companyName.trim() === data.companyName}>
              Зберегти
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}
