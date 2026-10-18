import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { PLANS, isPlanId, plansFor } from "@/lib/plans";
import { lpConfig } from "@/lib/lpConfig";
import { seatUsage } from "@/lib/seats";

export async function GET() {
  const user = await requireUser("billing");
  if (user instanceof Response) return user;
  const payments = await query<{ order_reference: string; plan: string; amount: string; method: string; status: string; created_at: Date; paid_at: Date | null }>(
    "select order_reference, plan, amount, method, status, created_at, paid_at from payments where company_id = $1 order by created_at desc limit 30",
    [user.companyId],
  );
  const usage = await query<{ month: string; count: string }>(
    "select count(*)::text as count, to_char(now(), 'YYYY-MM') as month from usage where company_id = $1 and kind in ('analysis', 'unlock') and created_at >= date_trunc('month', now())",
    [user.companyId],
  );
  const pending = payments.filter((p) => p.method === "invoice" && p.status === "pending");
  const seats = await seatUsage(user.companyId);
  const refunds = await query<{ count: string }>(
    "select count(*)::text as count from usage where company_id = $1 and kind = 'analysis_refund' and created_at >= date_trunc('month', now())",
    [user.companyId],
  );
  return Response.json({
    company: {
      kind: user.companyKind,
      name: user.companyName,
      plan: user.plan,
      planName: isPlanId(user.plan) ? PLANS[user.plan].name : user.plan,
      credits: user.credits,
      periodEnd: user.periodEnd,
      recurringActive: user.recurringActive,
    },
    seats,
    usedThisMonth: Number(usage[0]?.count ?? 0) - Number(refunds[0]?.count ?? 0),
    plans: plansFor(user.companyKind),
    cardEnabled: Boolean(lpConfig()),
    invoiceEnabled: Boolean(process.env.INVOICE_DETAILS),
    canPay: true,
    pendingInvoices: pending.map((p) => ({
      orderReference: p.order_reference,
      amount: Number(p.amount),
      plan: isPlanId(p.plan) ? PLANS[p.plan].name : p.plan,
      details: (process.env.INVOICE_DETAILS || "Реквізити надішле адміністратор сервісу.").replace(/\\n/g, "\n"),
      purpose: `Оплата за доступ до сервісу LotScope, рахунок ${p.order_reference}, без ПДВ`,
    })),
    payments: payments.map((p) => ({
      orderReference: p.order_reference,
      plan: isPlanId(p.plan) ? PLANS[p.plan].name : p.plan,
      amount: Number(p.amount),
      method: p.method,
      status: p.status,
      createdAt: p.created_at.toISOString(),
      paidAt: p.paid_at?.toISOString() ?? null,
    })),
  });
}
