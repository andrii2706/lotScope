import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { can } from "@/lib/roles";
import { fail, readJson, text } from "@/lib/server";

interface Ctx {
  params: Promise<{ id: string }>;
}

async function find(id: string, companyId: string) {
  const rows = await query<{ user_id: string | null; title: string }>("select user_id, title from reports where id = $1 and company_id = $2", [id, companyId]);
  return rows[0] ?? null;
}

export async function PATCH(request: Request, { params }: Ctx) {
  const user = await requireUser("reports");
  if (user instanceof Response) return user;
  const { id } = await params;
  const row = await find(text(id, 40), user.companyId);
  if (!row) return fail(404, "Звіт не знайдено.");
  const body = await readJson<{ overrides?: unknown; expert?: unknown }>(request);
  const overrides = body?.overrides && typeof body.overrides === "object" ? body.overrides : null;
  const expert = body?.expert && typeof body.expert === "object" ? body.expert : null;
  if (!overrides && !expert) return fail(400, "Нічого змінювати.");
  if (expert && !can(user, "expert")) return fail(403, "Недостатньо прав для цієї дії.");
  if (overrides && !can(user, "expert") && (row.user_id !== user.id || !can(user, "save"))) {
    return fail(403, "Змінювати розрахунок може лише автор звіту з активною підпискою.");
  }
  if (overrides) await query("update reports set body = jsonb_set(body, '{overrides}', $2::jsonb) where id = $1", [id, JSON.stringify(overrides)]);
  if (expert) {
    await query("update reports set body = jsonb_set(body, '{expert}', $2::jsonb) where id = $1", [id, JSON.stringify(expert)]);
    await audit(user, "report_review", row.title || id);
  }
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const user = await requireUser("reports");
  if (user instanceof Response) return user;
  const { id } = await params;
  const row = await find(text(id, 40), user.companyId);
  if (!row) return Response.json({ ok: true });
  if (row.user_id !== user.id) return fail(403, "Видалити звіт може лише його автор.");
  await query("delete from reports where id = $1", [id]);
  await audit(user, "report_delete", row.title || id);
  return Response.json({ ok: true });
}
