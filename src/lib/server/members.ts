import { newToken, sha256 } from "./auth.ts";
import { query, tx } from "./db.ts";
import type { Target } from "@/types/auth";

export const INVITE_DAYS = 7;

export async function createInvite(companyId: string, role: string, createdBy: string, teamId: string | null = null): Promise<{ token: string }> {
  const token = newToken();
  await query(
    "insert into invites (token_hash, company_id, role, created_by, expires_at, team_id) values ($1, $2, $3, $4, now() + $5::interval, $6)",
    [sha256(token), companyId, role, createdBy, `${INVITE_DAYS} days`, teamId],
  );
  return { token };
}

export async function cancelInvites(companyId: string, teamId: string | null = null) {
  await query("update invites set used_at = now() where company_id = $1 and used_at is null and ($2::text is null or team_id = $2)", [companyId, teamId]);
}

export async function findTarget(companyId: string, userId: string): Promise<Target | null> {
  const rows = await query<Target>("select role, team_id, email from users where id = $1 and company_id = $2", [userId, companyId]);
  return rows[0] ?? null;
}

export async function deactivateUser(companyId: string, userId: string, protectRole = "admin"): Promise<boolean> {
  return tx(async (c) => {
    const res = await c.query("update users set active = false where id = $1 and company_id = $2 and role <> $3 returning id", [userId, companyId, protectRole]);
    if (res.rowCount) await c.query("delete from sessions where user_id = $1", [userId]);
    return Boolean(res.rowCount);
  });
}

export async function activateUser(companyId: string, userId: string): Promise<boolean> {
  const res = await query("update users set active = true where id = $1 and company_id = $2 returning id", [userId, companyId]);
  return res.length > 0;
}

export async function removeUser(companyId: string, userId: string, protectRole = "admin"): Promise<boolean> {
  const res = await query("delete from users where id = $1 and company_id = $2 and role <> $3 returning id", [userId, companyId, protectRole]);
  return res.length > 0;
}

export async function changeRole(companyId: string, userId: string, role: string, protectRole = "admin"): Promise<boolean> {
  const res = await query("update users set role = $3 where id = $1 and company_id = $2 and role <> $4 returning id", [userId, companyId, role, protectRole]);
  return res.length > 0;
}

export async function setTeam(companyId: string, userId: string, teamId: string | null): Promise<boolean> {
  const res = await query(
    "update users set team_id = $3 where id = $1 and company_id = $2 and role <> 'admin' and ($3::text is null or exists (select 1 from teams t where t.id = $3 and t.company_id = $2)) returning id",
    [userId, companyId, teamId],
  );
  return res.length > 0;
}

export async function userLabel(companyId: string, userId: string): Promise<string> {
  const rows = await query<{ email: string }>("select email from users where id = $1 and company_id = $2", [userId, companyId]);
  return rows[0]?.email ?? userId;
}
