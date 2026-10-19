"use client";

import { Copy, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AuditList, stamp, type AuditEntry } from "@/components/AuditList";
import { Button, Notice, PageHeader, Segmented } from "@/components/ui";
import { api } from "@/lib/api";
import { ACTION_LABEL } from "@/lib/audit-labels";
import { PLANS, isPlanId } from "@/lib/plans";

interface Company {
  id: string; name: string; plan: string; credits: number; seats: number; period_end: string | null; recurring_active: boolean;
  suspended: boolean; users: string; active_users: string; analyses: string; reports: string; last_seen: string | null; created_at: string;
}
interface Admin {
  companies: Company[];
  invoices: { order_reference: string; company_id: string; company_name: string; plan: string; amount: string; created_at: string }[];
  totals: { teams: string; personal: string; users: string; analyses: string; revenue: string; subscribed: string; suspended: string };
  kind: "team" | "personal";
}
type Tab = "teams" | "personal" | "invoices" | "log";

const uah = (n: number | string) => `${Number(n).toLocaleString("uk-UA")} грн`;

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("teams");
  const [data, setData] = useState<Admin | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);
  const kind = tab === "personal" ? "personal" : "team";

  useEffect(() => {
    let alive = true;
    api<Admin>(`/api/admin?kind=${kind}`)
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [version, kind]);

  async function post(body: Record<string, unknown>) {
    setError("");
    try {
      const r = await api<Record<string, unknown>>("/api/admin", { body });
      reload();
      return r;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося.");
      return null;
    }
  }

  if (error && !data) {
    return (
      <Notice tone="bad" title="Немає доступу">
        {error}
      </Notice>
    );
  }
  if (!data) return <p className="text-sm text-muted">Завантажую…</p>;
  const t = data.totals;

  return (
    <div>
      <PageHeader title="Консоль супер адміна" description="Команди й компанії, місця, рахунки, доступ та журнал усіх дій у сервісі." />
      {error && (
        <div className="mb-5">
          <Notice tone="bad" title="Помилка">
            {error}
          </Notice>
        </div>
      )}

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Компаній", t.teams],
          ["Особистих акаунтів", t.personal],
          ["Активних підписок", t.subscribed],
          ["Аналізів за місяць", t.analyses],
          ["Користувачів", t.users],
          ["Оплат за місяць", uah(t.revenue)],
          ["Рахунків очікує", String(data.invoices.length)],
          ["Призупинено", t.suspended],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <Segmented
        className="mb-5 max-w-2xl"
        label="Розділ"
        value={tab}
        onChange={setTab}
        options={[
          { value: "teams", label: "Компанії" },
          { value: "personal", label: "Особисті" },
          { value: "invoices", label: `Рахунки (${data.invoices.length})` },
          { value: "log", label: "Журнал" },
        ]}
      />

      {tab === "teams" && <CreateCompany onCreate={post} />}
      {(tab === "teams" || tab === "personal") && <CompanyTable companies={data.companies} kind={tab} post={post} />}
      {tab === "invoices" && <Invoices data={data} post={post} />}
      {tab === "log" && <Log />}
    </div>
  );
}

function CreateCompany({ onCreate }: { onCreate: (b: Record<string, unknown>) => Promise<Record<string, unknown> | null> }) {
  const [name, setName] = useState("");
  const [seats, setSeats] = useState("5");
  const [credits, setCredits] = useState("3");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await onCreate({ action: "createCompany", name, seats: Number(seats), credits: Number(credits) });
    if (r) {
      setName("");
      setCopied(false);
      setLink(typeof r.inviteUrl === "string" ? r.inviteUrl : "");
    }
  }

  return (
    <section className="card mb-5 p-5 sm:p-6">
      <h2 className="text-lg font-extrabold">Нова компанія</h2>
      <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-3">
        <label className="min-w-56 flex-1">
          <span className="mb-1.5 block text-[13px] font-bold text-ink/80">Назва</span>
          <input className="control" required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="w-28">
          <span className="mb-1.5 block text-[13px] font-bold text-ink/80">Місць</span>
          <input className="control" type="number" min={1} required value={seats} onChange={(e) => setSeats(e.target.value)} />
        </label>
        <label className="w-32">
          <span className="mb-1.5 block text-[13px] font-bold text-ink/80">Аналізів</span>
          <input className="control" type="number" min={0} value={credits} onChange={(e) => setCredits(e.target.value)} />
        </label>
        <Button type="submit">
          <Plus className="size-4" /> Створити
        </Button>
      </form>
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
          <p className="w-full text-xs text-muted">Посилання для адміністратора компанії: одноразове, діє 7 днів. Надішліть його контактній особі клієнта.</p>
        </div>
      )}
    </section>
  );
}

function CompanyTable({ companies, kind, post }: { companies: Company[]; kind: "teams" | "personal"; post: (b: Record<string, unknown>) => Promise<unknown> }) {
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  if (companies.length === 0) return <p className="text-sm text-muted">Поки порожньо.</p>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
            <th className="px-4 py-3">{kind === "teams" ? "Компанія" : "Акаунт"}</th>
            <th className="px-4 py-3">Тариф</th>
            <th className="px-4 py-3">Залишок</th>
            <th className="px-4 py-3">Аналізів / міс.</th>
            <th className="px-4 py-3">Звітів</th>
            <th className="px-4 py-3">Людей</th>
            {kind === "teams" && <th className="px-4 py-3">Місць</th>}
            <th className="px-4 py-3">Остання дія</th>
            <th className="px-4 py-3">Нарахувати</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => (
            <tr key={c.id} className="border-b border-line last:border-b-0">
              <td className="px-4 py-3">
                <Link href={`/admin/company/${c.id}`} className="block font-bold hover:underline">
                  {c.name}
                </Link>
                <span className="text-xs text-muted">з {new Date(c.created_at).toLocaleDateString("uk-UA")}</span>
                {c.suspended && <span className="ml-2 rounded-full bg-bad-bg px-2 py-0.5 text-xs font-bold text-bad">призупинено</span>}
              </td>
              <td className="px-4 py-3">
                {isPlanId(c.plan) ? PLANS[c.plan].name : c.plan}
                {c.period_end && new Date(c.period_end) > new Date() && <span className="ml-1.5 text-xs text-good">до {new Date(c.period_end).toLocaleDateString("uk-UA")}</span>}
              </td>
              <td className="px-4 py-3 font-bold tabular-nums">{c.credits}</td>
              <td className="px-4 py-3 tabular-nums">{c.analyses}</td>
              <td className="px-4 py-3 tabular-nums">{c.reports}</td>
              <td className="px-4 py-3 tabular-nums">
                {c.active_users}/{c.users}
              </td>
              {kind === "teams" && (
                <td className="px-4 py-3">
                  <input
                    className="control !min-h-9 !w-16 !py-1"
                    type="number"
                    min={1}
                    aria-label={`Місць для ${c.name}`}
                    defaultValue={c.seats}
                    onBlur={(e) => Number(e.target.value) !== c.seats && Number(e.target.value) >= 1 && post({ action: "setSeats", companyId: c.id, seats: Number(e.target.value) })}
                  />
                </td>
              )}
              <td className="px-4 py-3 text-xs text-muted">{stamp(c.last_seen)}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <input
                    className="control !min-h-9 !w-20 !py-1"
                    type="number"
                    aria-label={`Кількість аналізів для ${c.name}`}
                    placeholder="+10"
                    value={amounts[c.id] ?? ""}
                    onChange={(e) => setAmounts((a) => ({ ...a, [c.id]: e.target.value }))}
                  />
                  <Button
                    variant="secondary"
                    disabled={!Number(amounts[c.id])}
                    onClick={async () => {
                      await post({ action: "addCredits", companyId: c.id, credits: Number(amounts[c.id]) });
                      setAmounts((a) => ({ ...a, [c.id]: "" }));
                    }}
                  >
                    OK
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Invoices({ data, post }: { data: Admin; post: (b: Record<string, unknown>) => Promise<unknown> }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [plan, setPlan] = useState("start");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    api<Admin>("/api/admin?kind=team")
      .then((d) => {
        setCompanies(d.companies);
        setCompanyId((id) => id || d.companies[0]?.id || "");
      })
      .catch(() => undefined);
  }, []);

  return (
    <div>
      <section className="card mb-5 p-5 sm:p-6">
        <h2 className="text-lg font-extrabold">Виставити рахунок</h2>
        <form
          className="mt-3 flex flex-wrap items-end gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            await post({ action: "createInvoice", companyId, plan, amount: amount ? Number(amount) : undefined });
            setAmount("");
          }}
        >
          <label className="min-w-56 flex-1">
            <span className="mb-1.5 block text-[13px] font-bold text-ink/80">Компанія</span>
            <select className="control" value={companyId} onChange={(e) => setCompanyId(e.target.value)} required>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="w-48">
            <span className="mb-1.5 block text-[13px] font-bold text-ink/80">Тариф</span>
            <select className="control" value={plan} onChange={(e) => setPlan(e.target.value)}>
              {["start", "team", "pack20"].map((id) => (
                <option key={id} value={id}>
                  {PLANS[id as keyof typeof PLANS].name} · {uah(PLANS[id as keyof typeof PLANS].priceUah)}
                </option>
              ))}
            </select>
          </label>
          <label className="w-40">
            <span className="mb-1.5 block text-[13px] font-bold text-ink/80">Інша сума, грн</span>
            <input className="control" type="number" min={1} placeholder="за тарифом" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <Button type="submit" disabled={!companyId}>
            Виставити
          </Button>
        </form>
        <p className="mt-3 text-xs text-muted">Рахунок з&apos;явиться на сторінці «Тариф і оплата» адміністратора компанії разом з реквізитами з INVOICE_DETAILS. Після підтвердження оплати тариф і аналізи нараховуються автоматично.</p>
      </section>

      <h2 className="mb-3 text-lg font-extrabold">Очікують оплати</h2>
      {data.invoices.length === 0 ? (
        <p className="text-sm text-muted">Немає.</p>
      ) : (
        <ul className="card overflow-hidden">
          {data.invoices.map((i) => (
            <li key={i.order_reference} className="flex flex-wrap items-center gap-3 border-b border-line p-4 last:border-b-0">
              <span className="min-w-0 flex-1">
                <span className="block font-bold">
                  {i.company_name} · {isPlanId(i.plan) ? PLANS[i.plan].name : i.plan}
                </span>
                <span className="text-sm text-muted">
                  {i.order_reference} · {uah(i.amount)} · {new Date(i.created_at).toLocaleDateString("uk-UA")}
                </span>
              </span>
              <Button variant="secondary" onClick={() => window.confirm(`Скасувати рахунок ${i.order_reference}?`) && post({ action: "cancelInvoice", orderReference: i.order_reference })}>
                Скасувати
              </Button>
              <Button onClick={() => window.confirm(`Кошти за рахунком ${i.order_reference} надійшли? Тариф і аналізи буде нараховано.`) && post({ action: "approveInvoice", orderReference: i.order_reference })}>
                Оплату отримано
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Log() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(
    (offset: number, replace: boolean) => {
      api<{ entries: AuditEntry[]; next: number | null }>(`/api/admin/log?offset=${offset}${action ? `&action=${action}` : ""}`)
        .then((d) => {
          setEntries((cur) => (replace ? d.entries : [...cur, ...d.entries]));
          setNext(d.next);
        })
        .catch((e: Error) => setError(e.message));
    },
    [action],
  );

  useEffect(() => load(0, true), [load]);

  return (
    <div>
      {error && <p className="mb-3 text-sm text-bad">{error}</p>}
      <label className="mb-4 block max-w-xs">
        <span className="mb-1.5 block text-[13px] font-bold text-ink/80">Тип події</span>
        <select className="control" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">Усі</option>
          {Object.entries(ACTION_LABEL).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="card overflow-hidden">
        <AuditList entries={entries} showCompany />
      </div>
      {next !== null && (
        <Button variant="secondary" className="mt-4" onClick={() => load(next, false)}>
          Показати ще
        </Button>
      )}
    </div>
  );
}
