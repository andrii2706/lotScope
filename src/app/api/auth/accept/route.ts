import { audit } from "@/lib/server/audit";
import { createSession, newId, normalizeEmail, sha256 } from "@/lib/server/auth";
import { dbConfigured, dbMissing, query, tx } from "@/lib/server/db";
import { hashPassword, passwordProblem } from "@/lib/server/password";
import { fail, readJson, text } from "@/lib/server/http";
import { route } from "@/lib/server/route";

interface Invite {
  company_id: string;
  company_name: string;
  role: string;
}

async function findInvite(token: string): Promise<Invite | null> {
  const rows = await query<Invite>(
    `select i.company_id, c.name as company_name, i.role from invites i join companies c on c.id = i.company_id
      where i.token_hash = $1 and i.used_at is null and i.expires_at > now()`,
    [sha256(token)],
  );
  return rows[0] ?? null;
}

async function handleGet(request: Request) {
  if (!dbConfigured()) return dbMissing();
  const token = new URL(request.url).searchParams.get("token") || "";
  const invite = token ? await findInvite(token) : null;
  if (!invite) return fail(404, "Запрошення недійсне або прострочене.");
  return Response.json({ companyName: invite.company_name, role: invite.role });
}

async function handlePost(request: Request) {
  if (!dbConfigured()) return dbMissing();
  const body = await readJson<Record<string, unknown>>(request);
  const token = text(body?.token, 200);
  const name = text(body?.name, 120);
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!name || !email) return fail(400, "Вкажіть ім'я та коректний email.");
  const problem = passwordProblem(password);
  if (problem) return fail(400, problem);
  const hash = await hashPassword(password);
  const userId = newId();
  const result = await tx(async (c) => {
    const inv = await c.query<{ company_id: string; role: string; team_id: string | null }>(
      "update invites set used_at = now() where token_hash = $1 and used_at is null and expires_at > now() returning company_id, role, team_id",
      [sha256(token)],
    );
    if (!inv.rows[0]) return "invalid";
    const exists = await c.query("select 1 from users where email = $1", [email]);
    if (exists.rowCount) throw new Error("exists");
    await c.query(
      "insert into users (id, email, name, password_hash, company_id, role, team_id) values ($1, $2, $3, $4, $5, $6, $7)",
      [userId, email, name, hash, inv.rows[0].company_id, inv.rows[0].role, inv.rows[0].team_id],
    );
    return { companyId: inv.rows[0].company_id, role: inv.rows[0].role };
  }).catch((e: Error) => (e.message === "exists" ? e.message : Promise.reject(e)));
  if (result === "invalid") return fail(404, "Запрошення недійсне або прострочене.");
  if (result === "exists") return fail(409, "Акаунт з таким email уже існує.");
  await createSession(userId);
  await audit({ id: userId, name, role: result.role, companyId: result.companyId }, "invite_accept", email);
  return Response.json({ ok: true, role: result.role });
}

async function handleGET(request: Request) {
  return handleGet(request);
}

async function handlePOST(request: Request) {
  return handlePost(request);
}

export const GET = route(handleGET);
export const POST = route(handlePOST);
