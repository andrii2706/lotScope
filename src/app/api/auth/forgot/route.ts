import { audit } from "@/lib/server/audit";
import { newToken, normalizeEmail, sha256 } from "@/lib/server/auth";
import { dbConfigured, dbMissing, query } from "@/lib/server/db";
import { resetEmail, sendMail } from "@/lib/server/mail";
import { fail, readJson } from "@/lib/server/http";
import { route } from "@/lib/server/route";

const TTL_MINUTES = 60;
const WINDOW = 60 * 60_000;
const PER_EMAIL = 3;
const PER_IP = 10;
const hits = new Map<string, { count: number; until: number }>();

function limited(key: string, limit: number): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (h && h.until > now) {
    if (h.count >= limit) return true;
    h.count++;
    return false;
  }
  hits.set(key, { count: 1, until: now + WINDOW });
  return false;
}

function appUrl(request: Request): string {
  const configured = (process.env.APP_URL || "").replace(/\/+$/, "");
  return configured || new URL(request.url).origin;
}

const DONE = { ok: true, message: "Якщо акаунт з такою поштою існує, ми надіслали на неї лист із посиланням для скидання пароля." };

async function handlePost(request: Request) {
  if (!dbConfigured()) return dbMissing();
  const body = await readJson<{ email?: unknown }>(request);
  const email = normalizeEmail(body?.email);
  if (!email || !email.includes("@")) return fail(400, "Вкажіть email, з яким ви входите.");
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";
  if (limited(`ip:${ip}`, PER_IP) || limited(`email:${email}`, PER_EMAIL)) {
    return fail(429, "Забагато запитів на скидання пароля. Спробуйте через годину.");
  }

  const rows = await query<{ id: string; name: string; role: string; company_id: string; active: boolean }>(
    "select id, name, role, company_id, active from users where email = $1",
    [email],
  );
  const user = rows[0];
  if (!user || !user.active) return Response.json(DONE);

  const token = newToken();
  await query("delete from password_resets where user_id = $1 and used_at is null", [user.id]);
  await query(
    "insert into password_resets (token_hash, user_id, expires_at) values ($1, $2, now() + make_interval(mins => $3))",
    [sha256(token), user.id, TTL_MINUTES],
  );
  const link = `${appUrl(request)}/reset-password?token=${encodeURIComponent(token)}`;
  const sent = await sendMail({ to: email, ...resetEmail(user.name, link, TTL_MINUTES) });
  await audit({ id: user.id, name: user.name, role: user.role, companyId: user.company_id }, "password_reset_request", email, sent ? "лист надіслано" : "лист не надіслано");
  return Response.json(DONE);
}

async function handlePOST(request: Request) {
  return handlePost(request);
}

export const POST = route(handlePOST);
