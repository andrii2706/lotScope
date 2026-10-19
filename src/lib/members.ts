import { newToken, sha256 } from "./auth";
import { query, tx } from "./db";
import { seatUsage } from "./seats";

export const INVITE_DAYS = 7;

export type MemberResult = "ok" | "full" | "none";

export async function createInvite(companyId: string, role: string, createdBy: string): Promise<{ token: string } | "full"> {
  const token = newToken();
  const created = await tx(async (c) => {
    await c.query("select 1 from companies where id = $1 for update", [companyId]);
    if ((await seatUsage(companyId, c)).free < 1) return false;
    await c.query(
      "insert into invites (token_hash, company_id, role, created_by, expires_at) values ($1, $2, $3, $4, now() + $5::interval)",
      [sha256(token), companyId, role, createdBy, `${INVITE_DAYS} days`],
    );
    return true;
  });
  return created ? { token } : "full";
}

export async function cancelInvites(companyId: string) {
  await query("update invites set used_at = now() where company_id = $1 and used_at is null", [companyId]);
}

export async function deactivateUser(companyId: string, userId: string, protectRole = "admin"): Promise<boolean> {
  return tx(async (c) => {
    const res = await c.query("update users set active = false where id = $1 and company_id = $2 and role <> $3 returning id", [userId, companyId, protectRole]);
    if (res.rowCount) await c.query("delete from sessions where user_id = $1", [userId]);
    return Boolean(res.rowCount);
  });
}

export async function activateUser(companyId: string, userId: string): Promise<MemberResult> {
  return tx(async (c) => {
    await c.query("select 1 from companies where id = $1 for update", [companyId]);
    const target = await c.query<{ active: boolean }>("select active from users where id = $1 and company_id = $2", [userId, companyId]);
    if (!target.rows[0]) return "none";
    if (target.rows[0].active) return "ok";
    if ((await seatUsage(companyId, c)).free < 1) return "full";
    await c.query("update users set active = true where id = $1", [userId]);
    return "ok";
  });
}

export async function removeUser(companyId: string, userId: string, protectRole = "admin"): Promise<boolean> {
  const res = await query("delete from users where id = $1 and company_id = $2 and role <> $3 returning id", [userId, companyId, protectRole]);
  return res.length > 0;
}

export async function changeRole(companyId: string, userId: string, role: string, protectRole = "admin"): Promise<boolean> {
  const res = await query("update users set role = $3 where id = $1 and company_id = $2 and role <> $4 returning id", [userId, companyId, role, protectRole]);
  return res.length > 0;
}

export async function userLabel(companyId: string, userId: string): Promise<string> {
  const rows = await query<{ email: string }>("select email from users where id = $1 and company_id = $2", [userId, companyId]);
  return rows[0]?.email ?? userId;
}
