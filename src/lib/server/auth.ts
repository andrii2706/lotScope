import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { dbConfigured, dbMissing, query } from "./db.ts";

export const SESSION_COOKIE = "ls_session";
import { can, homeFor } from "../shared/roles.ts";
import type { CurrentUser, Permission, Role } from "@/types/auth";


export const homePath = (role: string): string => homeFor(role as Role);

export function sessionHours(): number {
  const n = Number(process.env.SESSION_HOURS);
  return Number.isFinite(n) && n > 0 && n <= 24 * 30 ? n : 8;
}

export const newId = () => randomUUID().replace(/-/g, "").slice(0, 16);
export const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");

export function isAdminEmail(email: string): boolean {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export function normalizeEmail(v: unknown): string {
  const email = typeof v === "string" ? v.trim().toLowerCase() : "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200 ? email : "";
}

export async function createSession(userId: string) {
  const token = newToken();
  const expires = new Date(Date.now() + sessionHours() * 3600_000);
  await query("insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)", [sha256(token), userId, expires]);
  const h = await headers();
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim() || (process.env.APP_URL?.startsWith("https://") ? "https" : "http");
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: proto === "https",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await query("delete from sessions where token_hash = $1 or expires_at < now()", [sha256(token)]);
  store.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<CurrentUser | null> {
  if (!dbConfigured()) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await query<{
    id: string;
    email: string;
    name: string;
    role: Role;
    company_id: string;
    company_name: string;
    team_id: string | null;
    team_name: string | null;
    kind: "team" | "personal";
    suspended: boolean;
    suspended_reason: string;
    expires_at: Date;
  }>(
    `select u.id, u.email, u.name, u.role, u.company_id, c.name as company_name, u.team_id, t.name as team_name,
            c.kind, c.suspended, c.suspended_reason, s.expires_at
       from sessions s join users u on u.id = s.user_id join companies c on c.id = u.company_id
       left join teams t on t.id = u.team_id
      where s.token_hash = $1 and s.expires_at > now() and s.created_at + make_interval(secs => $2) > now() and u.active`,
    [sha256(token), sessionHours() * 3600],
  );
  const r = rows[0];
  if (!r) return null;
  const isAdmin = isAdminEmail(r.email);
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: isAdmin ? "superadmin" : r.role,
    companyId: r.company_id,
    companyName: r.company_name,
    teamId: r.team_id,
    teamName: r.team_name,
    isAdmin,
    companyKind: r.kind,
    suspended: r.suspended && !isAdmin,
    suspendedReason: r.suspended_reason,
    sessionExpiresAt: r.expires_at.toISOString(),
  };
}

export async function requireUser(permission?: Permission): Promise<CurrentUser | Response> {
  if (!dbConfigured()) {
    return dbMissing();
  }
  const user = await currentUser();
  if (!user) return Response.json({ error: "Сесія завершилась. Увійдіть у свій акаунт.", code: "session" }, { status: 401 });
  if (user.suspended) {
    return Response.json({ error: `Доступ вашої компанії призупинено.${user.suspendedReason ? ` ${user.suspendedReason}` : ""}`, code: "suspended" }, { status: 403 });
  }
  if (permission && !can(user, permission)) {
    return Response.json({ error: "Недостатньо прав для цієї дії.", code: "forbidden" }, { status: 403 });
  }
  return user;
}
