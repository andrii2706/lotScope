import { audit } from "@/lib/audit";
import { query } from "@/lib/db";
import { INVITE_DAYS, activateUser, cancelInvites, changeRole, createInvite, deactivateUser, removeUser } from "@/lib/members";
import { INVITABLE_BY_SUPERADMIN } from "@/lib/roles";
import { SEATS_FULL_MESSAGE, seatUsage } from "@/lib/seats";
import { fail, readJson, text } from "@/lib/server";
import { requireSuperadmin } from "@/lib/superadmin";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Ctx) {
  const admin = await requireSuperadmin();
  if (admin instanceof Response) return admin;
  const { id } = await params;
  const company = (
    await query<{ id: string; name: string; kind: string; plan: string; credits: number; seats: number; period_end: Date | null; recurring_active: boolean; suspended: boolean; suspended_reason: string; created_at: Date }>(
      "select id, name, kind, plan, credits, seats, period_end, recurring_active, suspended, suspended_reason, created_at from companies where id = $1",
      [id],
    )
  )[0];
  if (!company) return fail(404, "Компанію не знайдено.");
  const members = await query<{ id: string; name: string; email: string; role: string; active: boolean; google: boolean; created_at: Date; analyses: string; reports: string; last_seen: Date | null }>(
    `select u.id, u.name, u.email, u.role, u.active, (u.google_sub is not null) as google, u.created_at,
            (select count(*) from usage g where g.user_id = u.id and g.kind in ('analysis', 'unlock') and g.created_at >= date_trunc('month', now()))::text as analyses,
            (select count(*) from reports r where r.user_id = u.id)::text as reports,
            (select max(a.created_at) from audit_log a where a.user_id = u.id) as last_seen
       from users u where u.company_id = $1 order by u.created_at`,
    [id],
  );
  const invites = await query<{ role: string; expires_at: Date }>("select role, expires_at from invites where company_id = $1 and used_at is null and expires_at > now() order by created_at desc", [id]);
  const payments = await query<{ order_reference: string; plan: string; amount: string; method: string; status: string; created_at: Date; paid_at: Date | null }>(
    "select order_reference, plan, amount, method, status, created_at, paid_at from payments where company_id = $1 order by created_at desc limit 30",
    [id],
  );
  const log = await query<{ id: string; actor: string; role: string; action: string; target: string; detail: string; created_at: Date }>(
    "select id::text, actor, role, action, target, detail, created_at from audit_log where company_id = $1 order by created_at desc limit 60",
    [id],
  );
  const stats = await query<{ month: string; analyses: string; unlocks: string; reports: string; pdfs: string }>(
    `select to_char(now(), 'YYYY-MM') as month,
            (select count(*) from usage where company_id = $1 and kind = 'analysis' and created_at >= date_trunc('month', now()))::text as analyses,
            (select count(*) from usage where company_id = $1 and kind = 'unlock' and created_at >= date_trunc('month', now()))::text as unlocks,
            (select count(*) from reports where company_id = $1)::text as reports,
            (select count(*) from audit_log where company_id = $1 and action = 'report_pdf' and created_at >= date_trunc('month', now()))::text as pdfs`,
    [id],
  );
  return Response.json({ company, members, invites, payments, log, stats: stats[0], seatUsage: await seatUsage(id) });
}

export async function POST(request: Request, { params }: Ctx) {
  const admin = await requireSuperadmin();
  if (admin instanceof Response) return admin;
  const { id } = await params;
  const body = await readJson<{ action?: string; userId?: string; role?: string }>(request);
  const exists = (await query<{ name: string }>("select name from companies where id = $1", [id]))[0];
  if (!exists) return fail(404, "Компанію не знайдено.");
  const userId = text(body?.userId, 40);
  const who = userId ? ((await query<{ email: string }>("select email from users where id = $1 and company_id = $2", [userId, id]))[0]?.email ?? userId) : "";

  switch (body?.action) {
    case "invite": {
      const role = INVITABLE_BY_SUPERADMIN.find((r) => r === body.role) ?? "manager";
      const made = await createInvite(id, role, admin.id);
      if (made === "full") return fail(409, SEATS_FULL_MESSAGE);
      await audit(admin, "invite_create", role, exists.name, id);
      return Response.json({ url: `${new URL(request.url).origin}/invite/${made.token}`, days: INVITE_DAYS });
    }
    case "cancelInvites":
      await cancelInvites(id);
      await audit(admin, "invite_cancel", exists.name, "", id);
      return Response.json({ ok: true });
    case "deactivate":
      await deactivateUser(id, userId, "");
      await audit(admin, "user_active", who, "вимкнено", id);
      return Response.json({ ok: true });
    case "activate": {
      const result = await activateUser(id, userId);
      if (result === "full") return fail(409, SEATS_FULL_MESSAGE);
      await audit(admin, "user_active", who, "увімкнено", id);
      return Response.json({ ok: true });
    }
    case "remove":
      if (await removeUser(id, userId, "")) await audit(admin, "user_delete", who, "", id);
      return Response.json({ ok: true });
    case "role": {
      const role = INVITABLE_BY_SUPERADMIN.find((r) => r === body.role);
      if (!role) return fail(400, "Оберіть роль.");
      await changeRole(id, userId, role, "");
      await audit(admin, "user_role", who, role, id);
      return Response.json({ ok: true });
    }
  }
  return fail(400, "Невідома дія.");
}
