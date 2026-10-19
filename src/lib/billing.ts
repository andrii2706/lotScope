import type pg from "pg";
import { query, tx } from "./db";
import { PLANS, type PlanId, isPlanId, nextPeriodEnd } from "./plans";

export async function consumeCredit(companyId: string, userId: string, kind: string, note = ""): Promise<boolean> {
  return tx(async (c) => {
    const res = await c.query("update companies set credits = credits - 1 where id = $1 and credits > 0 returning credits", [companyId]);
    if (res.rowCount === 0) return false;
    await c.query("insert into usage (company_id, user_id, kind, note) values ($1, $2, $3, $4)", [companyId, userId, kind, note]);
    return true;
  });
}

export async function refundCredit(companyId: string, userId: string, kind: string) {
  await tx(async (c) => {
    await c.query("update companies set credits = credits + 1 where id = $1", [companyId]);
    await c.query("insert into usage (company_id, user_id, kind, note) values ($1, $2, $3, 'повернення')", [companyId, userId, `${kind}_refund`]);
  });
}

export async function hasCredits(companyId: string): Promise<boolean> {
  const rows = await query<{ credits: number }>("select credits from companies where id = $1", [companyId]);
  return (rows[0]?.credits ?? 0) > 0;
}

async function grant(c: pg.PoolClient, companyId: string, plan: PlanId) {
  const p = PLANS[plan];
  if (p.recurring) {
    const row = await c.query<{ period_end: Date | null }>("select period_end from companies where id = $1 for update", [companyId]);
    const end = nextPeriodEnd(row.rows[0]?.period_end ?? null, new Date());
    await c.query(
      "update companies set plan = $2, credits = credits + $3, period_end = $4 where id = $1",
      [companyId, plan, p.credits, end],
    );
  } else {
    await c.query("update companies set credits = credits + $2 where id = $1", [companyId, p.credits]);
  }
}

export type ApplyResult = "applied" | "duplicate" | "unknown";

export async function approvePayment(params: {
  orderReference: string;
  baseReference: string;
  amount: number;
  raw: unknown;
  recToken?: string;
}): Promise<ApplyResult> {
  return tx(async (c) => {
    const existing = await c.query<{ status: string }>("select status from payments where order_reference = $1 for update", [params.orderReference]);
    if (existing.rows[0]?.status === "approved") return "duplicate";
    const base = await c.query<{ company_id: string; plan: string }>(
      "select company_id, plan from payments where order_reference = $1",
      [params.baseReference],
    );
    const source = base.rows[0];
    if (!source || !isPlanId(source.plan)) return "unknown";
    if (existing.rows[0]) {
      await c.query("update payments set status = 'approved', paid_at = now(), raw = $2 where order_reference = $1", [params.orderReference, JSON.stringify(params.raw)]);
    } else {
      await c.query(
        `insert into payments (order_reference, company_id, plan, amount, method, status, raw, paid_at)
         values ($1, $2, $3, $4, 'card', 'approved', $5, now())`,
        [params.orderReference, source.company_id, source.plan, params.amount, JSON.stringify(params.raw)],
      );
    }
    await grant(c, source.company_id, source.plan);
    if (PLANS[source.plan].recurring) {
      await c.query("update companies set recurring_ref = $2, recurring_active = true where id = $1", [source.company_id, params.baseReference]);
    }
    return "applied";
  });
}

export async function approveInvoice(orderReference: string): Promise<ApplyResult> {
  return tx(async (c) => {
    const row = await c.query<{ company_id: string; plan: string; status: string }>(
      "select company_id, plan, status from payments where order_reference = $1 for update",
      [orderReference],
    );
    const p = row.rows[0];
    if (!p || !isPlanId(p.plan)) return "unknown";
    if (p.status === "approved") return "duplicate";
    await c.query("update payments set status = 'approved', paid_at = now() where order_reference = $1", [orderReference]);
    await grant(c, p.company_id, p.plan);
    return "applied";
  });
}

export async function addCreditsManually(companyId: string, credits: number, note: string) {
  await tx(async (c) => {
    await c.query("update companies set credits = greatest(0, credits + $2) where id = $1", [companyId, credits]);
    await c.query("insert into usage (company_id, kind, note) values ($1, 'manual_credits', $2)", [companyId, `${credits > 0 ? "+" : ""}${credits}: ${note}`]);
  });
}

export async function declinePayment(orderReference: string, raw: unknown) {
  await query("update payments set status = 'declined', raw = $2 where order_reference = $1 and status = 'pending'", [orderReference, JSON.stringify(raw)]);
}

export async function stopRecurring(orderId: string) {
  await query("update companies set recurring_active = false where recurring_ref = $1", [orderId]);
}
