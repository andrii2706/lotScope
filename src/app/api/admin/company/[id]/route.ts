import { audit } from "@/lib/server/audit";
import { query } from "@/lib/server/db";
import { INVITE_DAYS, cancelInvites, createInvite, removeUser } from "@/lib/server/members";
import { INVITABLE_BY_SUPERADMIN } from "@/lib/shared/roles";
import { fail, readJson, text } from "@/lib/server/http";
import { requireSuperadmin } from "@/lib/server/superadmin";
import { route } from "@/lib/server/route";

interface Ctx {
  params: Promise<{ id: string }>;
}

async function handleGET(_request: Request, { params }: Ctx) {
  const admin = await requireSuperadmin();
  if (admin instanceof Response) return admin;
  const { id } = await params;
  const company = (
    await query<{ id: string; name: string; kind: string; created_at: Date }>(
      "select id, name, kind, created_at from companies where id = $1",
      [id],
    )
  )[0];
  if (!company) return fail(404, "Компанію не знайдено.");
  const members = await query<{ id: string; name: string; email: string; role: string; active: boolean; google: boolean; created_at: Date; team: string | null; analyses: string; reports: string; last_seen: Date | null }>(
    `select u.id, u.name, u.email, u.role, u.active, (u.google_sub is not null) as google, u.created_at,
            (select t.name from teams t where t.id = u.team_id) as team,
            (select count(*) from audit_log a where a.user_id = u.id and a.action = 'analyze' and a.created_at >= date_trunc('month', now()))::text as analyses,
            (select count(*) from reports r where r.user_id = u.id)::text as reports,
            (select max(a.created_at) from audit_log a where a.user_id = u.id) as last_seen
       from users u where u.company_id = $1 order by u.created_at`,
    [id],
  );
  const invites = await query<{ role: string; expires_at: Date }>("select role, expires_at from invites where company_id = $1 and used_at is null and expires_at > now() order by created_at desc", [id]);
  const log = await query<{ id: string; actor: string; role: string; action: string; target: string; detail: string; created_at: Date }>(
    "select id::text, actor, role, action, target, detail, created_at from audit_log where company_id = $1 order by created_at desc limit 60",
    [id],
  );
  const stats = await query<{ month: string; analyses: string; unlocks: string; reports: string; pdfs: string }>(
    `select to_char(now(), 'YYYY-MM') as month,
            (select count(*) from audit_log where company_id = $1 and action = 'analyze' and created_at >= date_trunc('month', now()))::text as analyses,
            (select count(*) from audit_log where company_id = $1 and action = 'unlock' and created_at >= date_trunc('month', now()))::text as unlocks,
            (select count(*) from reports where company_id = $1)::text as reports,
            (select count(*) from audit_log where company_id = $1 and action = 'report_pdf' and created_at >= date_trunc('month', now()))::text as pdfs`,
    [id],
  );
  return Response.json({ company, members, invites, log, stats: stats[0] });
}

async function handlePOST(request: Request, { params }: Ctx) {
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
      await audit(admin, "invite_create", role, exists.name, id);
      return Response.json({ url: `${new URL(request.url).origin}/invite/${made.token}`, days: INVITE_DAYS });
    }
    case "cancelInvites":
      await cancelInvites(id);
      await audit(admin, "invite_cancel", exists.name, "", id);
      return Response.json({ ok: true });
    case "remove":
      if (await removeUser(id, userId, "")) await audit(admin, "user_delete", who, "", id);
      return Response.json({ ok: true });
  }
  return fail(400, "Невідома дія.");
}

export const GET = route(handleGET);
export const POST = route(handlePOST);
