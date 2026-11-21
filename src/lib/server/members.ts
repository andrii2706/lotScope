import { newToken, normalizeEmail, sha256 } from "./auth.ts";
import { appUrl } from "./http.ts";
import { inviteEmail, sendMail } from "./mail.ts";
import { ROLE_LABEL } from "../shared/roles.ts";
import { langOf, withLang } from "../shared/i18n.ts";
import { query, tx } from "./db.ts";
import type { Role, Target } from "@/types/auth";
import type { InviteResult } from "@/types/team";

export const INVITE_DAYS = 7;

export async function createInvite(companyId: string, role: string, createdBy: string, teamId: string | null = null, email: string | null = null): Promise<{ token: string }> {
  const token = newToken();
  await tx(async (c) => {
    if (email) await c.query("update invites set used_at = now() where company_id = $1 and email = $2 and used_at is null", [companyId, email]);
    await c.query(
      "insert into invites (token_hash, company_id, role, created_by, expires_at, team_id, email) values ($1, $2, $3, $4, now() + $5::interval, $6, $7)",
      [sha256(token), companyId, role, createdBy, `${INVITE_DAYS} days`, teamId, email],
    );
  });
  return { token };
}

export type InviteOutcome = InviteResult | { error: string; status: number };

export async function inviteByEmail(opts: {
  request: Request;
  companyId: string;
  role: string;
  createdBy: string;
  inviterName: string;
  teamId?: string | null;
  email: unknown;
}): Promise<InviteOutcome> {
  const email = normalizeEmail(opts.email);
  if (!email) return { error: "Вкажіть коректну пошту людини, якій надсилаєте запрошення.", status: 400 };
  const taken = await query("select 1 from users where email = $1", [email]);
  if (taken.length) return { error: "Людина з такою поштою вже має доступ до LotScope.", status: 409 };
  const row = (await query<{ name: string; market: string | null }>("select name, settings->>'market' as market from companies where id = $1", [opts.companyId]))[0];
  const company = row?.name ?? "LotScope";
  const lang = langOf(row?.market);
  const made = await createInvite(opts.companyId, opts.role, opts.createdBy, opts.teamId ?? null, email);
  const url = `${appUrl(opts.request)}/invite/${made.token}`;
  const label = withLang(lang, () => ROLE_LABEL[opts.role as Role] ?? opts.role);
  const emailed = await sendMail({ to: email, ...inviteEmail({ companyName: company, roleLabel: label, inviter: opts.inviterName, link: url, days: INVITE_DAYS, lang }) });
  return { url, days: INVITE_DAYS, email, emailed };
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
