import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { dbConfigured, dbDown, query } from "./db";
import { PAID_SUBSCRIPTIONS } from "./plans";

export const SESSION_COOKIE = "ls_session";
import { can, homeFor, type Permission, type Role } from "./roles";

export type { Role };

export const homePath = (role: string): string => homeFor(role as Role);

export function sessionHours(): number {
  const n = Number(process.env.SESSION_HOURS);
  return Number.isFinite(n) && n > 0 && n <= 24 * 30 ? n : 8;
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId: string;
  companyName: string;
  plan: string;
  credits: number;
  periodEnd: string | null;
  recurringActive: boolean;
  isAdmin: boolean;
  companyKind: "team" | "personal";
  subscribed: boolean;
  suspended: boolean;
  suspendedReason: string;
  sessionExpiresAt: string;
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
    plan: string;
    credits: number;
    period_end: Date | null;
    recurring_active: boolean;
    kind: "team" | "personal";
    suspended: boolean;
    suspended_reason: string;
    expires_at: Date;
  }>(
    `select u.id, u.email, u.name, u.role, u.company_id, c.name as company_name, c.plan, c.credits, c.period_end, c.recurring_active,
            c.kind, c.suspended, c.suspended_reason, s.expires_at
       from sessions s join users u on u.id = s.user_id join companies c on c.id = u.company_id
      where s.token_hash = $1 and s.expires_at > now() and u.active`,
    [sha256(token)],
  );
  const r = rows[0];
  if (!r) return null;
  const isAdmin = isAdminEmail(r.email);
  const subscribed = Boolean(r.period_end && r.period_end.getTime() > Date.now() && PAID_SUBSCRIPTIONS.includes(r.plan));
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: isAdmin ? "superadmin" : r.role,
    companyId: r.company_id,
    companyName: r.company_name,
    plan: r.plan,
    credits: r.credits,
    periodEnd: r.period_end ? r.period_end.toISOString() : null,
    recurringActive: r.recurring_active,
    isAdmin,
    companyKind: r.kind,
    subscribed,
    suspended: r.suspended && !isAdmin,
    suspendedReason: r.suspended_reason,
    sessionExpiresAt: r.expires_at.toISOString(),
  };
}

export async function requireUser(permission?: Permission): Promise<CurrentUser | Response> {
  if (!dbConfigured()) {
    return Response.json({ error: "База даних не налаштована: додайте DATABASE_URL у .env.local." }, { status: 503 });
  }
  let user: CurrentUser | null;
  try {
    user = await currentUser();
  } catch (e) {
    return dbDown(e);
  }
  if (!user) return Response.json({ error: "Сесія завершилась. Увійдіть у свій акаунт.", code: "session" }, { status: 401 });
  if (user.suspended) {
    return Response.json({ error: `Доступ вашої компанії призупинено.${user.suspendedReason ? ` ${user.suspendedReason}` : ""}`, code: "suspended" }, { status: 403 });
  }
  if (permission && !can(user, permission)) {
    const subscriptionOnly = can({ role: user.role, subscribed: true }, permission);
    return Response.json(
      { error: subscriptionOnly ? "Ця дія доступна лише з активною підпискою." : "Недостатньо прав для цієї дії.", code: subscriptionOnly ? "subscription" : "forbidden" },
      { status: 403 },
    );
  }
  return user;
}
