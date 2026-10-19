"use client";

import { Copy, Link2, Power, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Notice, PageHeader, Segmented } from "@/components/ui";
import { api } from "@/lib/api";
import { ROLE_LABEL, refreshMe, useMe } from "@/lib/me";

interface Team {
  members: { id: string; name: string; email: string; role: "admin" | "manager" | "expert" | "user"; active: boolean; google: boolean; created_at: string; analyses: string }[];
  invites: { role: "manager" | "expert"; expires_at: string }[];
  seats: { total: number; active: number; pending: number; free: number };
  companyName: string;
}

export default function TeamPage() {
  const me = useMe();
  const [team, setTeam] = useState<Team | null>(null);
  const [role, setRole] = useState<"manager" | "expert">("manager");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    let alive = true;
    api<Team>("/api/team")
      .then((t) => {
        if (!alive) return;
        setTeam(t);
        setCompanyName(t.companyName);
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [version]);

  const owner = me.status === "ready" && me.user?.role === "admin";
  const reload = () => setVersion((v) => v + 1);

  async function invite() {
    setError("");
    setCopied(false);
    try {
      const r = await api<{ url: string }>("/api/team", { body: { role } });
      setLink(r.url);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося створити запрошення.");
    }
  }

  async function act(method: "PATCH" | "DELETE", body: Record<string, unknown>) {
    setError("");
    try {
      await api("/api/team", { method, body });
      reload();
      void refreshMe();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося.");
    }
  }

  const seats = team?.seats;
  const full = seats ? seats.free < 1 : false;

  return (
    <div>
      <PageHeader
        title="Команда і ліцензії"
        description="Кожна людина займає одне робоче місце. Кількість місць задає адміністратор сервісу. Менеджери шукають лоти й формують звіти, технічний спеціаліст СТО перевіряє звіти й навчає модель. Усі працюють з одним залишком аналізів."
      />
      {error && (
        <div className="mb-5">
          <Notice tone="bad" title="Помилка">
            {error}
          </Notice>
        </div>
      )}

      {seats && (
        <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="card p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Місць за тарифом</p>
            <p className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{seats.total}</p>
          </div>
          <div className="card p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Зайнято</p>
            <p className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{seats.active}</p>
          </div>
          <div className="card p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Чекають запрошення</p>
            <p className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{seats.pending}</p>
          </div>
          <div className="card p-4 sm:p-5">
            <p className={`text-xs font-bold uppercase tracking-wider ${full ? "text-warn" : "text-muted"}`}>Вільно</p>
            <p className={`mt-1 font-display text-2xl font-semibold sm:text-3xl ${full ? "text-warn" : ""}`}>{seats.free}</p>
          </div>
        </section>
      )}
      {owner && full && (
        <div className="mb-5">
          <Notice tone="warn" title="Вільних місць немає">
            Щоб додати людину, вимкніть доступ комусь із команди. Кількість робочих місць змінює лише адміністратор сервісу LotScope: зверніться до нього, якщо потрібно більше.
          </Notice>
        </div>
      )}

      {owner && (
        <section className="card mb-5 p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">Запросити людину</h2>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <Segmented
              className="w-full sm:w-80"
              label="Роль"
              value={role}
              onChange={setRole}
              options={[
                { value: "manager", label: "Менеджер з пошуку" },
                { value: "expert", label: "Технічний спеціаліст СТО" },
              ]}
            />
            <Button onClick={invite} disabled={full}>
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
              <p className="w-full text-xs text-muted">
                Посилання одноразове і діє 7 днів. Людина може зареєструватися паролем або через Google. Поки посилання не використане, воно резервує місце.
              </p>
            </div>
          )}
        </section>
      )}

      {owner && team && (
        <section className="card mb-5 p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">Назва компанії</h2>
          <form
            className="mt-3 flex flex-wrap gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void act("PATCH", { companyName });
            }}
          >
            <input className="control min-w-0 flex-1" aria-label="Назва компанії" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            <Button type="submit" variant="secondary" disabled={!companyName.trim() || companyName.trim() === team.companyName}>
              Зберегти
            </Button>
          </form>
        </section>
      )}

      <section className="card overflow-hidden">
        <ul>
          {team?.members.map((m) => (
            <li key={m.id} className={`flex flex-wrap items-center gap-3 border-b border-line p-4 last:border-b-0 sm:px-6 ${m.active ? "" : "bg-panel2/50"}`}>
              <span className="grid size-10 place-items-center rounded-full bg-panel2 font-extrabold ring-1 ring-line2">{m.name.charAt(0).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className={`block font-bold ${m.active ? "" : "text-muted line-through decoration-1"}`}>{m.name}</span>
                <span className="block truncate text-sm text-muted">
                  {m.email}
                  {m.google && " · Google"}
                </span>
              </span>
              <span className="text-right text-xs text-muted">
                <span className="block text-base font-extrabold tabular-nums text-ink">{m.analyses}</span>
                лотів за місяць
              </span>
              {!m.active && <span className="rounded-full bg-warn-bg px-3 py-1 text-xs font-bold text-warn">Доступ вимкнено</span>}
              {owner && m.role === "manager" || m.role === "expert" ? (
                <>
                  <select
                    className="control !min-h-9 !w-auto !py-1"
                    aria-label={`Роль: ${m.name}`}
                    value={m.role}
                    onChange={(e) => act("PATCH", { id: m.id, role: e.target.value })}
                  >
                    <option value="manager">Менеджер з пошуку</option>
                    <option value="expert">Технічний спеціаліст СТО</option>
                  </select>
                  <button
                    type="button"
                    aria-label={m.active ? `Вимкнути доступ: ${m.name}` : `Увімкнути доступ: ${m.name}`}
                    aria-pressed={m.active}
                    onClick={() =>
                      m.active
                        ? window.confirm(`Вимкнути доступ для ${m.name}? Людина вийде з акаунта, а місце звільниться.`) && act("PATCH", { id: m.id, active: false })
                        : act("PATCH", { id: m.id, active: true })
                    }
                    className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-extrabold ${
                      m.active ? "border-good bg-good-bg text-good" : "border-line2 text-muted"
                    }`}
                  >
                    <Power className="size-3.5" /> {m.active ? "Ліцензія активна" : "Видати ліцензію"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Видалити ${m.name}`}
                    onClick={() => window.confirm(`Видалити ${m.name} з команди?`) && act("DELETE", { id: m.id })}
                    className="grid size-9 place-items-center rounded-full text-muted hover:bg-bad-bg hover:text-bad"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </>
              ) : (
                <span className="rounded-full bg-panel2 px-3 py-1 text-xs font-bold">{ROLE_LABEL[m.role]}</span>
              )}
            </li>
          ))}
        </ul>
        {team && team.invites.length > 0 && (
          <p className="flex flex-wrap items-center gap-3 border-t border-line px-6 py-3 text-sm text-muted">
            Відкритих запрошень: {team.invites.length}
            {owner && (
              <button type="button" onClick={() => act("DELETE", { invite: true })} className="font-bold text-bad hover:underline">
                Скасувати всі
              </button>
            )}
          </p>
        )}
      </section>
    </div>
  );
}
