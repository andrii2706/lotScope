import { audit } from "@/lib/server/audit";
import { newId, requireUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { INVITE_DAYS, activateUser, cancelInvites, changeRole, createInvite, deactivateUser, findTarget, removeUser, setTeam } from "@/lib/server/members";
import { INVITABLE_BY_ADMIN, INVITABLE_BY_LEAD } from "@/lib/shared/roles";
import { fail, readJson, text } from "@/lib/server/http";
import { route } from "@/lib/server/route";
import type { CurrentUser } from "@/types/auth";

function leadTeam(user: CurrentUser): string | null {
  return user.role === "lead" ? (user.teamId ?? "") : null;
}

async function teamOf(companyId: string, teamId: unknown): Promise<string | null> {
  const id = text(teamId, 40);
  if (!id) return null;
  const rows = await query<{ id: string }>("select id from teams where id = $1 and company_id = $2", [id, companyId]);
  return rows[0]?.id ?? null;
}

async function canManage(user: CurrentUser, targetId: string): Promise<string | Response> {
  if (targetId === user.id) return fail(400, "Свій доступ змінити не можна.");
  const target = await findTarget(user.companyId, targetId);
  if (!target) return fail(404, "Людину не знайдено.");
  if (target.role === "admin") return fail(403, "Адміністратора компанії змінює лише адміністратор сервісу.");
  const team = leadTeam(user);
  if (team !== null && (target.team_id !== team || target.role !== "manager")) {
    return fail(403, "Керівник команди керує лише менеджерами своєї команди.");
  }
  return target.email;
}

async function handleGET() {
  const user = await requireUser("team");
  if (user instanceof Response) return user;
  const team = leadTeam(user);
  const members = await query<{ id: string; name: string; email: string; role: string; active: boolean; google: boolean; created_at: Date; team_id: string | null; analyses: string }>(
    `select u.id, u.name, u.email, u.role, u.active, (u.google_sub is not null) as google, u.created_at, u.team_id,
            (select count(*) from audit_log a where a.user_id = u.id and a.action = 'analyze' and a.created_at >= date_trunc('month', now()))::text as analyses
       from users u where u.company_id = $1 and ($2::text is null or u.team_id = $2)
      order by case u.role when 'admin' then 0 when 'lead' then 1 when 'manager' then 2 else 3 end, u.name`,
    [user.companyId, team],
  );
  const teams = await query<{ id: string; name: string }>(
    "select id, name from teams where company_id = $1 and ($2::text is null or id = $2) order by name",
    [user.companyId, team],
  );
  const invites = await query<{ role: string; team_id: string | null; expires_at: Date }>(
    "select role, team_id, expires_at from invites where company_id = $1 and used_at is null and expires_at > now() and ($2::text is null or team_id = $2) order by created_at desc",
    [user.companyId, team],
  );
  return Response.json({ members, teams, invites, companyName: user.companyName, lead: team !== null, teamId: team });
}

async function handlePOST(request: Request) {
  const user = await requireUser("team");
  if (user instanceof Response) return user;
  const body = await readJson<{ action?: string; role?: string; teamId?: string; name?: string }>(request);
  const team = leadTeam(user);

  if (body?.action === "createTeam") {
    if (team !== null) return fail(403, "Команди створює адміністратор компанії.");
    const name = text(body.name, 80);
    if (!name) return fail(400, "Вкажіть назву команди.");
    const id = newId();
    await query("insert into teams (id, company_id, name) values ($1, $2, $3)", [id, user.companyId, name]);
    await audit(user, "team_create", name);
    return Response.json({ id });
  }

  const allowed = team !== null ? INVITABLE_BY_LEAD : INVITABLE_BY_ADMIN;
  const role = allowed.find((r) => r === body?.role);
  if (!role) return fail(400, "Оберіть роль.");
  let teamId: string | null;
  if (team !== null) {
    if (!team) return fail(400, "Вас ще не додали до команди. Зверніться до адміністратора компанії.");
    teamId = team;
  } else {
    teamId = await teamOf(user.companyId, body?.teamId);
    if (role === "lead" && !teamId) return fail(400, "Оберіть команду для керівника.");
  }
  const made = await createInvite(user.companyId, role, user.id, role === "expert" ? null : teamId);
  await audit(user, "invite_create", role);
  return Response.json({ url: `${new URL(request.url).origin}/invite/${made.token}`, role, days: INVITE_DAYS });
}

async function handlePATCH(request: Request) {
  const user = await requireUser("team");
  if (user instanceof Response) return user;
  const body = await readJson<{ id?: string; role?: string; active?: boolean; teamId?: string | null; companyName?: string; renameTeam?: string; name?: string }>(request);
  const lead = leadTeam(user) !== null;

  if (typeof body?.companyName === "string") {
    if (lead) return fail(403, "Недостатньо прав для цієї дії.");
    const name = text(body.companyName, 120);
    if (!name) return fail(400, "Вкажіть назву компанії.");
    await query("update companies set name = $2 where id = $1", [user.companyId, name]);
    await audit(user, "company_rename", name);
    return Response.json({ ok: true });
  }

  if (typeof body?.renameTeam === "string") {
    if (lead) return fail(403, "Недостатньо прав для цієї дії.");
    const name = text(body.name, 80);
    if (!name) return fail(400, "Вкажіть назву команди.");
    await query("update teams set name = $3 where id = $1 and company_id = $2", [text(body.renameTeam, 40), user.companyId, name]);
    await audit(user, "team_rename", name);
    return Response.json({ ok: true });
  }

  const id = text(body?.id, 40);
  const label = await canManage(user, id);
  if (label instanceof Response) return label;

  if (typeof body?.active === "boolean") {
    if (body.active) await activateUser(user.companyId, id);
    else await deactivateUser(user.companyId, id);
    await audit(user, "user_active", label, body.active ? "увімкнено" : "вимкнено");
    return Response.json({ ok: true });
  }

  if (lead) return fail(403, "Роль і команду змінює адміністратор компанії.");

  if (body && "teamId" in body) {
    const teamId = body.teamId ? await teamOf(user.companyId, body.teamId) : null;
    if (body.teamId && !teamId) return fail(404, "Команду не знайдено.");
    await setTeam(user.companyId, id, teamId);
    await audit(user, "user_team", label, teamId ?? "без команди");
    return Response.json({ ok: true });
  }

  const role = INVITABLE_BY_ADMIN.find((r) => r === body?.role);
  if (!role) return fail(400, "Оберіть роль.");
  await changeRole(user.companyId, id, role);
  await audit(user, "user_role", label, role);
  return Response.json({ ok: true });
}

async function handleDELETE(request: Request) {
  const user = await requireUser("team");
  if (user instanceof Response) return user;
  const body = await readJson<{ id?: string; invite?: boolean; teamId?: string }>(request);
  const team = leadTeam(user);
  if (body?.invite) {
    await cancelInvites(user.companyId, team);
    await audit(user, "invite_cancel");
    return Response.json({ ok: true });
  }
  if (body?.teamId) {
    if (team !== null) return fail(403, "Команди видаляє адміністратор компанії.");
    const rows = await query<{ name: string }>("delete from teams where id = $1 and company_id = $2 returning name", [text(body.teamId, 40), user.companyId]);
    if (rows[0]) await audit(user, "team_delete", rows[0].name);
    return Response.json({ ok: true });
  }
  const id = text(body?.id, 40);
  const label = await canManage(user, id);
  if (label instanceof Response) return label;
  if (await removeUser(user.companyId, id)) await audit(user, "user_delete", label);
  return Response.json({ ok: true });
}

export const GET = route(handleGET);
export const POST = route(handlePOST);
export const PATCH = route(handlePATCH);
export const DELETE = route(handleDELETE);
