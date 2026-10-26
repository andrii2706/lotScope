"use client";

import { confirmDialog } from "@/components/ConfirmDialog";
import { Check, CreditCard, FileText, LoaderCircle, Repeat } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button, Notice, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { refreshMe } from "@/lib/me";
import type { Plan } from "@/lib/plans";

interface Billing {
  company: { kind: "team" | "personal"; name: string; plan: string; planName: string; credits: number; periodEnd: string | null; recurringActive: boolean };
  usedThisMonth: number;
  seats: { total: number; active: number; pending: number; free: number };
  plans: Plan[];
  cardEnabled: boolean;
  invoiceEnabled: boolean;
  canPay: boolean;
  pendingInvoices: Invoice[];
  payments: { orderReference: string; plan: string; amount: number; method: string; status: string; createdAt: string; paidAt: string | null }[];
}

interface Invoice {
  orderReference: string;
  amount: number;
  plan: string;
  details: string;
  purpose: string;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  approved: { label: "Оплачено", cls: "bg-good-bg text-good" },
  pending: { label: "Очікує", cls: "bg-warn-bg text-warn" },
  declined: { label: "Відхилено", cls: "bg-bad-bg text-bad" },
  refunded: { label: "Повернено", cls: "bg-panel2 text-muted" },
};
const METHOD: Record<string, string> = { card: "Картка", invoice: "Рахунок", manual: "Вручну" };

const uah = (n: number) => `${n.toLocaleString("uk-UA")} грн`;
const date = (iso: string) => new Date(iso).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" });

function submitForm(action: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  form.acceptCharset = "utf-8";
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

export default function BillingPage() {
  const [data, setData] = useState<Billing | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [returned, setReturned] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api<Billing>("/api/billing"));
      await refreshMe();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося завантажити дані.");
    }
  }, []);

  useEffect(() => {
    let alive = true;
    api<Billing>("/api/billing")
      .then((d) => {
        if (!alive) return;
        setData(d);
        setReturned(window.location.search.includes("returned=1"));
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  async function payCard(plan: string) {
    setBusy(`card-${plan}`);
    setError("");
    try {
      const r = await api<{ action: string; fields: Record<string, string> }>("/api/billing/checkout", { body: { plan } });
      submitForm(r.action, r.fields);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося почати оплату.");
      setBusy("");
    }
  }

  async function payInvoice(plan: string) {
    setBusy(`inv-${plan}`);
    setError("");
    try {
      setInvoice(await api<Invoice>("/api/billing/invoice", { body: { plan } }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося створити рахунок.");
    } finally {
      setBusy("");
    }
  }

  async function cancel() {
    if (!(await confirmDialog({ title: "Скасувати підписку?", message: "Автоматичне щомісячне списання припиниться. Залишок аналізів збережеться.", confirmLabel: "Скасувати підписку", cancelLabel: "Залишити", tone: "danger" }))) return;
    setBusy("cancel");
    setError("");
    try {
      await api("/api/billing/cancel", { body: {} });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося скасувати.");
    } finally {
      setBusy("");
    }
  }

  if (!data) {
    return error ? (
      <Notice tone="bad" title="Помилка">
        {error}
      </Notice>
    ) : (
      <p className="text-sm text-muted">Завантажую…</p>
    );
  }

  const c = data.company;
  return (
    <div>
      <PageHeader title="Тариф і оплата" description={`Кабінет компанії «${c.name}». Кожен аналіз лота з ключем ШІ списує один аналіз із залишку.`} />

      {returned && (
        <div className="mb-5">
          <Notice tone="info" title="Дякуємо!">
            Якщо оплата пройшла, аналізи з’являться протягом хвилини. Оновіть сторінку, якщо їх ще не видно.
          </Notice>
        </div>
      )}
      {error && (
        <div className="mb-5">
          <Notice tone="bad" title="Помилка">
            {error}
          </Notice>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="card p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Залишок аналізів</p>
          <p className={`mt-1 font-display text-3xl font-semibold ${c.credits <= 3 ? "text-warn" : ""}`}>{c.credits}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Тариф</p>
          <p className="mt-1 font-display text-2xl font-semibold">{c.planName}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Використано цього місяця</p>
          <p className="mt-1 font-display text-3xl font-semibold">{data.usedThisMonth}</p>
        </div>
        {c.kind === "team" && (
        <div className="card p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Робочі місця</p>
          <p className="mt-1 font-display text-3xl font-semibold">
            {data.seats.active + data.seats.pending}
            <span className="text-lg text-muted"> / {data.seats.total}</span>
          </p>
          <Link href="/team" className="mt-1 inline-block text-xs font-bold text-accent-text hover:underline">
            Керувати командою
          </Link>
        </div>
        )}
        <div className="card p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Наступне списання</p>
          <p className="mt-1 text-lg font-extrabold">{c.recurringActive && c.periodEnd ? date(c.periodEnd) : "—"}</p>
          {c.recurringActive && data.canPay && (
            <button type="button" onClick={cancel} disabled={busy === "cancel"} className="mt-1 text-xs font-bold text-bad hover:underline">
              Скасувати автосписання
            </button>
          )}
        </div>
      </section>

      {data.pendingInvoices.length > 0 && (
        <section className="mt-6 space-y-3">
          <h2 className="text-lg font-extrabold">Рахунки до сплати</h2>
          {data.pendingInvoices.map((inv) => (
            <div key={inv.orderReference} className="card p-5 sm:p-6">
              <p className="font-extrabold">
                Рахунок {inv.orderReference} · {uah(inv.amount)}
              </p>
              <p className="mt-1 text-sm text-muted">Тариф «{inv.plan}». Доступ активується після надходження коштів.</p>
              <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-panel2 p-4 font-sans text-sm leading-relaxed">{inv.details}</pre>
              <p className="mt-3 text-sm">
                <span className="font-bold">Призначення платежу:</span> {inv.purpose}
              </p>
            </div>
          ))}
        </section>
      )}

      <h2 className="mb-3 mt-9 text-lg font-extrabold">Тарифи</h2>
      {!data.canPay && <p className="mb-3 text-sm text-muted">Оплачувати може лише адміністратор компанії.</p>}
      {data.canPay && !data.cardEnabled && !data.invoiceEnabled && (
        <div className="mb-4">
          <Notice tone="warn" title="Оплату ще не налаштовано">
            Додайте ключі LiqPay та/або реквізити для рахунків у .env.local. Поки що аналізи можна нараховувати в адмінці.
          </Notice>
        </div>
      )}
      <section className="grid gap-3 md:grid-cols-3">
        {data.plans.map((p) => {
          const current = c.plan === p.id && c.recurringActive;
          return (
            <div key={p.id} className={`card flex flex-col p-5 sm:p-6 ${current ? "ring-2 ring-accent-text" : ""}`}>
              <div className="flex items-center justify-between">
                <p className="text-lg font-extrabold">{p.name}</p>
                {p.recurring ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-panel2 px-2.5 py-0.5 text-xs font-bold text-muted">
                    <Repeat className="size-3" /> щомісяця
                  </span>
                ) : (
                  <span className="rounded-full bg-panel2 px-2.5 py-0.5 text-xs font-bold text-muted">разово</span>
                )}
              </div>
              <p className="mt-3 font-display text-3xl font-semibold">{uah(p.priceUah)}</p>
              <p className="text-sm text-muted">{p.recurring ? "на місяць" : "один раз"}</p>
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
                <Check className="size-4 text-good" /> {p.description}
              </p>
              <p className="mt-1 text-xs text-faint">≈ {Math.round(p.priceUah / p.credits)} грн за аналіз</p>
              {data.canPay && (
                <div className="mt-5 flex flex-col gap-2">
                  {data.cardEnabled && (
                    <Button disabled={Boolean(busy) || current} onClick={() => payCard(p.id)}>
                      {busy === `card-${p.id}` ? <LoaderCircle className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                      {current ? "Ваш тариф" : "Оплатити карткою"}
                    </Button>
                  )}
                  {data.invoiceEnabled && (
                    <Button variant="secondary" disabled={Boolean(busy)} onClick={() => payInvoice(p.id)}>
                      {busy === `inv-${p.id}` ? <LoaderCircle className="size-4 animate-spin" /> : <FileText className="size-4" />}
                      Рахунок для компанії
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>
      <p className="mt-2 text-xs text-faint">
        Карткою: оплата через LiqPay, підписка списується автоматично раз на місяць, скасувати можна тут. Рахунком: аналізи
        нараховуються після надходження коштів. Один аналіз відкриває один лот: деталі наживо, історію за VIN і звіт. Пошук і перегляд списку лотів безкоштовні.
      </p>

      {invoice && (
        <section className="card mt-5 p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">Рахунок {invoice.orderReference}</h2>
          <p className="mt-1 text-sm text-muted">
            Тариф «{invoice.plan}», до сплати {uah(invoice.amount)}. Після надходження коштів аналізи буде нараховано.
          </p>
          <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-panel2 p-4 font-sans text-sm leading-relaxed">{invoice.details}</pre>
          <p className="mt-3 text-sm">
            <span className="font-bold">Призначення платежу:</span> {invoice.purpose}
          </p>
        </section>
      )}

      <h2 className="mb-3 mt-9 text-lg font-extrabold">Історія оплат</h2>
      {data.payments.length === 0 ? (
        <p className="text-sm text-muted">Оплат ще не було.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-3 font-bold">Дата</th>
                <th className="px-4 py-3 font-bold">Тариф</th>
                <th className="px-4 py-3 font-bold">Спосіб</th>
                <th className="px-4 py-3 font-bold">Сума</th>
                <th className="px-4 py-3 font-bold">Статус</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((p) => (
                <tr key={p.orderReference} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3">{date(p.paidAt ?? p.createdAt)}</td>
                  <td className="px-4 py-3 font-semibold">{p.plan}</td>
                  <td className="px-4 py-3 text-muted">{METHOD[p.method] ?? p.method}</td>
                  <td className="px-4 py-3 tabular-nums">{uah(p.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS[p.status]?.cls ?? ""}`}>{STATUS[p.status]?.label ?? p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
