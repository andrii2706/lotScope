import { audit } from "@/lib/audit";
import { newId } from "@/lib/auth";
import { addCreditsManually, approveInvoice } from "@/lib/billing";
import { query, tx } from "@/lib/db";
import { createInvite, INVITE_DAYS } from "@/lib/members";
import { PLANS, TRIAL_CREDITS, isPlanId } from "@/lib/plans";
import { fail, readJson, text } from "@/lib/server";
import { requireSuperadmin } from "@/lib/superadmin";

export async function GET(request: Request) {
  const admin = await requireSuperadmin();
  if (admin instanceof Response) return admin;
  const kind = new URL(request.url).searchParams.get("kind") === "personal" ? "personal" : "team";
  const companies = await query<{
    id: string; name: string; plan: string; credits: number; seats: number; period_end: Date | null; recurring_active: boolean;
    suspended: boolean; users: string; active_users: string; analyses: string; reports: string; last_seen: Date | null; created_at: Date;
  }>(
    `select c.id, c.name, c.plan, c.credits, c.seats, c.period_end, c.recurring_active, c.suspended, c.created_at,
            (select count(*) from users u where u.company_id = c.id)::text as users,
            (select count(*) from users u where u.company_id = c.id and u.active)::text as active_users,
            (select count(*) from usage g where g.company_id = c.id and g.kind in ('analysis', 'unlock') and g.created_at >= date_trunc('month', now()))::text as analyses,
            (select count(*) from reports r where r.company_id = c.id)::text as reports,
            (select max(a.created_at) from audit_log a where a.company_id = c.id) as last_seen
       from companies c where c.kind = $1 order by c.created_at desc limit 300`,
    [kind],
  );
  const invoices = await query<{ order_reference: string; company_id: string; company_name: string; plan: string; amount: string; created_at: Date }>(
    `select p.order_reference, p.company_id, c.name as company_name, p.plan, p.amount, p.created_at
       from payments p join companies c on c.id = p.company_id
      where p.method = 'invoice' and p.status = 'pending' order by p.created_at desc`,
  );
  const totals = await query<{ teams: string; personal: string; users: string; analyses: string; revenue: string; subscribed: string; suspended: string }>(
    `select (select count(*) from companies where kind = 'team')::text as teams,
            (select count(*) from companies where kind = 'personal')::text as personal,
            (select count(*) from users)::text as users,
            (select count(*) from usage where kind in ('analysis', 'unlock') and created_at >= date_trunc('month', now()))::text as analyses,
            (select coalesce(sum(amount), 0) from payments where status = 'approved' and paid_at >= date_trunc('month', now()))::text as revenue,
            (select count(*) from companies where plan in ('personal', 'start', 'team') and period_end > now())::text as subscribed,
            (select count(*) from companies where suspended)::text as suspended`,
  );
  return Response.json({ companies, invoices, totals: totals[0], kind, plans: Object.values(PLANS).filter((p) => p.id !== "trial") });
}

export async function POST(request: Request) {
  const admin = await requireSuperadmin();
  if (admin instanceof Response) return admin;
  const body = await readJson<{
    action?: string; orderReference?: string; companyId?: string; credits?: number; seats?: number; note?: string;
    name?: string; reason?: string; plan?: string; amount?: number;
  }>(request);
  const companyId = text(body?.companyId, 40);
  const labelOf = async (id: string) => (await query<{ name: string }>("select name from companies where id = $1", [id]))[0]?.name ?? id;

  switch (body?.action) {
    case "createCompany": {
      const name = text(body.name, 120);
      const seats = Math.round(Number(body.seats));
      const credits = Math.max(0, Math.round(Number(body.credits ?? TRIAL_CREDITS)));
      if (!name) return fail(400, "Вкажіть назву компанії.");
      if (!Number.isFinite(seats) || seats < 1 || seats > 1000) return fail(400, "Вкажіть кількість місць від 1.");
      if (credits > 10000) return fail(400, "Забагато аналізів для старту.");
      const id = newId();
      await tx(async (c) => {
        await c.query("insert into companies (id, name, plan, credits, kind, seats) values ($1, $2, 'trial', $3, 'team', $4)", [id, name, credits, seats]);
      });
      const made = await createInvite(id, "admin", admin.id);
      await audit(admin, "company_create", name, `місць: ${seats}`, id);
      return Response.json({ id, inviteUrl: made === "full" ? null : `${new URL(request.url).origin}/invite/${made.token}`, days: INVITE_DAYS });
    }
    case "approveInvoice": {
      const ref = text(body.orderReference, 80);
      const result = await approveInvoice(ref);
      if (result === "unknown") return fail(404, "Рахунок не знайдено.");
      const row = (await query<{ company_id: string; amount: string }>("select company_id, amount from payments where order_reference = $1", [ref]))[0];
      await audit(admin, "invoice_paid", ref, row ? `${row.amount} грн` : "", row?.company_id);
      return Response.json({ result });
    }
    case "cancelInvoice": {
      const ref = text(body.orderReference, 80);
      const row = (await query<{ company_id: string }>("update payments set status = 'declined' where order_reference = $1 and method = 'invoice' and status = 'pending' returning company_id", [ref]))[0];
      if (!row) return fail(404, "Рахунок не знайдено.");
      await audit(admin, "invoice_cancel", ref, "", row.company_id);
      return Response.json({ ok: true });
    }
    case "createInvoice": {
      if (!isPlanId(body.plan) || body.plan === "trial") return fail(400, "Оберіть тариф.");
      const plan = PLANS[body.plan];
      const amount = body.amount === undefined || body.amount === null ? plan.priceUah : Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) return fail(400, "Вкажіть коректну суму.");
      if (!(await query("select 1 from companies where id = $1", [companyId])).length) return fail(404, "Компанію не знайдено.");
      const ref = `INV-${Date.now().toString(36).toUpperCase()}-${companyId.slice(0, 4).toUpperCase()}`;
      await query("insert into payments (order_reference, company_id, plan, amount, method, status) values ($1, $2, $3, $4, 'invoice', 'pending')", [ref, companyId, plan.id, amount]);
      await audit(admin, "invoice_create", ref, `${plan.name}, ${amount} грн`, companyId);
      return Response.json({ orderReference: ref });
    }
  }

  if (!companyId) return fail(400, "Оберіть компанію.");
  switch (body?.action) {
    case "addCredits": {
      const credits = Math.round(Number(body.credits));
      if (!Number.isFinite(credits) || credits === 0 || Math.abs(credits) > 10000) return fail(400, "Вкажіть кількість аналізів.");
      await addCreditsManually(companyId, credits, text(body.note, 200) || `супер адмін ${admin.email}`);
      await audit(admin, "credits", await labelOf(companyId), String(credits), companyId);
      return Response.json({ ok: true });
    }
    case "setSeats": {
      const seats = Math.round(Number(body.seats));
      if (!Number.isFinite(seats) || seats < 1 || seats > 1000) return fail(400, "Вкажіть кількість місць від 1.");
      await query("update companies set seats = $2 where id = $1", [companyId, seats]);
      await audit(admin, "seats", await labelOf(companyId), String(seats), companyId);
      return Response.json({ ok: true });
    }
    case "rename": {
      const name = text(body.name, 120);
      if (!name) return fail(400, "Вкажіть назву.");
      await query("update companies set name = $2 where id = $1", [companyId, name]);
      await audit(admin, "company_rename", name, "", companyId);
      return Response.json({ ok: true });
    }
    case "suspend": {
      await tx(async (c) => {
        await c.query("update companies set suspended = true, suspended_reason = $2 where id = $1", [companyId, text(body.reason, 300)]);
        await c.query("delete from sessions where user_id in (select id from users where company_id = $1)", [companyId]);
      });
      await audit(admin, "company_suspend", await labelOf(companyId), text(body.reason, 300), companyId);
      return Response.json({ ok: true });
    }
    case "resume": {
      await query("update companies set suspended = false, suspended_reason = '' where id = $1", [companyId]);
      await audit(admin, "company_resume", await labelOf(companyId), "", companyId);
      return Response.json({ ok: true });
    }
    case "deleteCompany": {
      const name = await labelOf(companyId);
      await query("delete from companies where id = $1 and kind = 'team'", [companyId]);
      await audit(admin, "company_delete", name, "", null);
      return Response.json({ ok: true });
    }
  }
  return fail(400, "Невідома дія.");
}
