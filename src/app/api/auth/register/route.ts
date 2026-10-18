import { audit } from "@/lib/audit";
import { createSession, newId, normalizeEmail } from "@/lib/auth";
import { dbConfigured, dbDown, query, tx } from "@/lib/db";
import { hashPassword, passwordProblem } from "@/lib/password";
import { TRIAL_CREDITS } from "@/lib/plans";
import { fail, readJson, text } from "@/lib/server";

async function handlePost(request: Request) {
  if (!dbConfigured()) return fail(503, "База даних не налаштована: додайте DATABASE_URL у .env.local.");
  const body = await readJson<Record<string, unknown>>(request);
  const name = text(body?.name, 120);
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!name) return fail(400, "Вкажіть своє ім'я.");
  if (!email) return fail(400, "Вкажіть коректний email.");
  const problem = passwordProblem(password);
  if (problem) return fail(400, problem);

  const exists = await query("select 1 from users where email = $1", [email]);
  if (exists.length) return fail(409, "Акаунт з таким email уже існує. Увійдіть.");

  const hash = await hashPassword(password);
  const userId = newId();
  const companyId = newId();
  await tx(async (c) => {
    await c.query("insert into companies (id, name, plan, credits, kind, seats) values ($1, $2, 'trial', $3, 'personal', 1)", [companyId, name, TRIAL_CREDITS]);
    await c.query(
      "insert into users (id, email, name, password_hash, company_id, role) values ($1, $2, $3, $4, $5, 'user')",
      [userId, email, name, hash, companyId],
    );
  });
  await createSession(userId);
  await audit({ id: userId, name, role: "user", companyId }, "register", email);
  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  return handlePost(request).catch(dbDown);
}
