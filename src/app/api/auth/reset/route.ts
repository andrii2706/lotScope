import { audit } from "@/lib/server/audit";
import { sha256 } from "@/lib/server/auth";
import { dbConfigured, dbMissing, query, tx } from "@/lib/server/db";
import { hashPassword, passwordProblem } from "@/lib/server/password";
import { fail, readJson } from "@/lib/server/http";
import { route } from "@/lib/server/route";

interface Row {
  user_id: string;
  name: string;
  email: string;
  role: string;
  company_id: string;
  active: boolean;
}

async function findToken(token: string): Promise<Row | null> {
  if (!token || token.length > 200) return null;
  const rows = await query<Row>(
    `select r.user_id, u.name, u.email, u.role, u.company_id, u.active
       from password_resets r join users u on u.id = r.user_id
      where r.token_hash = $1 and r.used_at is null and r.expires_at > now()`,
    [sha256(token)],
  );
  return rows[0] ?? null;
}

const EXPIRED = "Посилання недійсне або прострочене. Попросіть новий лист для скидання пароля.";

async function handleGET(request: Request) {
  if (!dbConfigured()) return dbMissing();
  const token = new URL(request.url).searchParams.get("token") || "";
  const row = await findToken(token).catch(() => null);
  if (!row || !row.active) return fail(410, EXPIRED);
  return Response.json({ ok: true, email: row.email });
}

async function handlePost(request: Request) {
  if (!dbConfigured()) return dbMissing();
  const body = await readJson<{ token?: unknown; password?: unknown; passwordConfirm?: unknown }>(request);
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const confirm = typeof body?.passwordConfirm === "string" ? body.passwordConfirm : "";
  const problem = passwordProblem(password);
  if (problem) return fail(400, problem);
  if (password !== confirm) return fail(400, "Паролі не збігаються.");
  const row = await findToken(token);
  if (!row || !row.active) return fail(410, EXPIRED);

  const hash = await hashPassword(password);
  const used = await tx(async (c) => {
    const mark = await c.query("update password_resets set used_at = now() where token_hash = $1 and used_at is null and expires_at > now()", [sha256(token)]);
    if (!mark.rowCount) return false;
    await c.query("update users set password_hash = $2 where id = $1", [row.user_id, hash]);
    await c.query("delete from sessions where user_id = $1", [row.user_id]);
    await c.query("delete from password_resets where user_id = $1 and used_at is null", [row.user_id]);
    return true;
  });
  if (!used) return fail(410, EXPIRED);
  await audit({ id: row.user_id, name: row.name, role: row.role, companyId: row.company_id }, "password_reset", row.email);
  return Response.json({ ok: true });
}

async function handlePOST(request: Request) {
  return handlePost(request);
}

export const GET = route(handleGET);
export const POST = route(handlePOST);
