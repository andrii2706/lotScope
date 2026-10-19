import { audit } from "@/lib/audit";
import { createSession, normalizeEmail } from "@/lib/auth";
import { dbConfigured, dbDown, query } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { fail, readJson } from "@/lib/server";

const attempts = new Map<string, { count: number; until: number }>();
const WINDOW = 15 * 60_000;
const LIMIT = 8;

async function handlePost(request: Request) {
  if (!dbConfigured()) return fail(503, "База даних не налаштована: додайте DATABASE_URL у .env.local.");
  const body = await readJson<Record<string, unknown>>(request);
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  const now = Date.now();
  const a = attempts.get(email);
  if (a && a.until > now && a.count >= LIMIT) return fail(429, "Забагато спроб. Спробуйте через 15 хвилин.");

  const rows = email ? await query<{ id: string; name: string; role: string; company_id: string; password_hash: string | null; active: boolean }>("select id, name, role, company_id, password_hash, active from users where email = $1", [email]) : [];
  if (rows[0] && !rows[0].password_hash) return fail(400, "Цей акаунт створено через Google. Натисніть «Увійти через Google».");
  const ok = rows[0]?.password_hash ? await verifyPassword(password, rows[0].password_hash) : false;
  if (!ok) {
    if (rows[0]) await audit({ id: rows[0].id, name: rows[0].name, role: rows[0].role, companyId: rows[0].company_id }, "login_failed", email);
    attempts.set(email, { count: (a && a.until > now ? a.count : 0) + 1, until: now + WINDOW });
    return fail(401, "Невірний email або пароль.");
  }
  attempts.delete(email);
  if (!rows[0].active) return fail(403, "Ваш доступ вимкнено адміністратором компанії.");
  await createSession(rows[0].id);
  await audit({ id: rows[0].id, name: rows[0].name, role: rows[0].role, companyId: rows[0].company_id }, "login", email);
  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  return handlePost(request).catch(dbDown);
}
