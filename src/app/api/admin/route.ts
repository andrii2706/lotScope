import { audit } from "@/lib/server/audit";
import { newId } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { createInvite, INVITE_DAYS } from "@/lib/server/members";
import { fail, readJson, text } from "@/lib/server/http";
import { requireSuperadmin } from "@/lib/server/superadmin";
import { route } from "@/lib/server/route";

async function handleGET(request: Request) {
  const admin = await requireSuperadmin();
  if (admin instanceof Response) return admin;
  const kind = new URL(request.url).searchParams.get("kind") === "personal" ? "personal" : "team";
  const companies = await query<{
    id: string; name: string; suspended: boolean; users: string; active_users: string; analyses: string; reports: string; last_seen: Date | null; created_at: Date;
  }>(
    `select c.id, c.name, c.suspended, c.created_at,
            (select count(*) from users u where u.company_id = c.id)::text as users,
            (select count(*) from users u where u.company_id = c.id and u.active)::text as active_users,
            (select count(*) from audit_log a where a.company_id = c.id and a.action = 'analyze' and a.created_at >= date_trunc('month', now()))::text as analyses,
            (select count(*) from reports r where r.company_id = c.id)::text as reports,
            (select max(a.created_at) from audit_log a where a.company_id = c.id) as last_seen
       from companies c where c.kind = $1 order by c.created_at desc limit 300`,
    [kind],
  );
  const totals = await query<{ teams: string; personal: string; users: string; analyses: string; suspended: string }>(
    `select (select count(*) from companies where kind = 'team')::text as teams,
            (select count(*) from companies where kind = 'personal')::text as personal,
            (select count(*) from users)::text as users,
            (select count(*) from audit_log where action = 'analyze' and created_at >= date_trunc('month', now()))::text as analyses,
            (select count(*) from companies where suspended)::text as suspended`,
  );
  return Response.json({ companies, totals: totals[0], kind });
}

async function handlePOST(request: Request) {
  const admin = await requireSuperadmin();
  if (admin instanceof Response) return admin;
  const body = await readJson<{
    action?: string; companyId?: string; name?: string;
  }>(request);
  const companyId = text(body?.companyId, 40);
  const labelOf = async (id: string) => (await query<{ name: string }>("select name from companies where id = $1", [id]))[0]?.name ?? id;

  switch (body?.action) {
    case "createCompany": {
      const name = text(body.name, 120);
      if (!name) return fail(400, "Вкажіть назву компанії.");
      const id = newId();
      await query("insert into companies (id, name, kind) values ($1, $2, 'team')", [id, name]);
      const made = await createInvite(id, "admin", admin.id);
      await audit(admin, "company_create", name, "", id);
      return Response.json({ id, inviteUrl: `${new URL(request.url).origin}/invite/${made.token}`, days: INVITE_DAYS });
    }
  }

  if (!companyId) return fail(400, "Оберіть компанію.");
  switch (body?.action) {
    case "deleteCompany": {
      const name = await labelOf(companyId);
      await query("delete from companies where id = $1 and kind = 'team'", [companyId]);
      await audit(admin, "company_delete", name, "", null);
      return Response.json({ ok: true });
    }
  }
  return fail(400, "Невідома дія.");
}

export const GET = route(handleGET);
export const POST = route(handlePOST);
