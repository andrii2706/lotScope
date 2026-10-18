import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { INVITE_DAYS, activateUser, cancelInvites, changeRole, createInvite, deactivateUser, removeUser, userLabel } from "@/lib/members";
import { INVITABLE_BY_ADMIN } from "@/lib/roles";
import { SEATS_FULL_MESSAGE, seatUsage } from "@/lib/seats";
import { fail, readJson, text } from "@/lib/server";

export async function GET() {
  const user = await requireUser("team");
  if (user instanceof Response) return user;
  const members = await query<{ id: string; name: string; email: string; role: string; active: boolean; google: boolean; created_at: Date; analyses: string }>(
    `select u.id, u.name, u.email, u.role, u.active, (u.google_sub is not null) as google, u.created_at,
            (select count(*) from usage g where g.user_id = u.id and g.kind in ('analysis', 'unlock') and g.created_at >= date_trunc('month', now()))::text as analyses
       from users u where u.company_id = $1 order by u.created_at`,
    [user.companyId],
  );
  const invites = await query<{ role: string; expires_at: Date; created_at: Date }>(
    "select role, expires_at, created_at from invites where company_id = $1 and used_at is null and expires_at > now() order by created_at desc",
    [user.companyId],
  );
  return Response.json({ members, invites, seats: await seatUsage(user.companyId), companyName: user.companyName });
}

export async function POST(request: Request) {
  const user = await requireUser("team");
  if (user instanceof Response) return user;
  const body = await readJson<{ role?: string }>(request);
  const role = INVITABLE_BY_ADMIN.find((r) => r === body?.role) ?? "manager";
  const made = await createInvite(user.companyId, role, user.id);
  if (made === "full") return fail(409, SEATS_FULL_MESSAGE);
  await audit(user, "invite_create", role);
  return Response.json({ url: `${new URL(request.url).origin}/invite/${made.token}`, role, days: INVITE_DAYS });
}

export async function PATCH(request: Request) {
  const user = await requireUser("team");
  if (user instanceof Response) return user;
  const body = await readJson<{ id?: string; role?: string; active?: boolean; companyName?: string }>(request);

  if (typeof body?.companyName === "string") {
    const name = text(body.companyName, 120);
    if (!name) return fail(400, "Вкажіть назву компанії.");
    await query("update companies set name = $2 where id = $1", [user.companyId, name]);
    await audit(user, "company_rename", name);
    return Response.json({ ok: true });
  }

  const id = text(body?.id, 40);
  if (id === user.id) return fail(400, "Свій доступ змінити не можна.");

  if (typeof body?.active === "boolean") {
    if (!body.active) {
      const label = await userLabel(user.companyId, id);
      await deactivateUser(user.companyId, id);
      await audit(user, "user_active", label, "вимкнено");
      return Response.json({ ok: true });
    }
    const result = await activateUser(user.companyId, id);
    if (result === "full") return fail(409, SEATS_FULL_MESSAGE);
    await audit(user, "user_active", await userLabel(user.companyId, id), "увімкнено");
    return Response.json({ ok: true });
  }

  const role = INVITABLE_BY_ADMIN.find((r) => r === body?.role);
  if (!role) return fail(400, "Оберіть роль.");
  await changeRole(user.companyId, id, role);
  await audit(user, "user_role", await userLabel(user.companyId, id), role);
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await requireUser("team");
  if (user instanceof Response) return user;
  const body = await readJson<{ id?: string; invite?: boolean }>(request);
  if (body?.invite) {
    await cancelInvites(user.companyId);
    await audit(user, "invite_cancel");
    return Response.json({ ok: true });
  }
  const id = text(body?.id, 40);
  if (id === user.id) return fail(400, "Не можна видалити себе.");
  const label = await userLabel(user.companyId, id);
  if (await removeUser(user.companyId, id)) await audit(user, "user_delete", label);
  return Response.json({ ok: true });
}
