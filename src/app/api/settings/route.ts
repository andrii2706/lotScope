import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { fail } from "@/lib/server";

const LOCAL_ONLY = ["theme", "expertName"];
const MAX_SETTINGS_CHARS = 1_500_000;

export async function GET() {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const rows = await query<{ settings: Record<string, unknown> }>("select settings from companies where id = $1", [user.companyId]);
  return Response.json({ settings: rows[0]?.settings ?? {} });
}

export async function PUT(request: Request) {
  const user = await requireUser("settings");
  if (user instanceof Response) return user;
  const raw = await request.text();
  if (raw.length > MAX_SETTINGS_CHARS) return fail(413, "Логотип завеликий. Оберіть файл меншого розміру.");
  let input: Record<string, unknown>;
  try {
    input = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return fail(400, "Не вдалося прочитати налаштування.");
  }
  const clean: Record<string, unknown> = {};
  for (const [key, fallback] of Object.entries(DEFAULT_SETTINGS)) {
    if (LOCAL_ONLY.includes(key)) continue;
    const value = input[key];
    if (typeof value === typeof fallback && (typeof value !== "number" || Number.isFinite(value))) clean[key] = value;
  }
  await query("update companies set settings = $2::jsonb where id = $1", [user.companyId, JSON.stringify(clean)]);
  await audit(user, "settings");
  return Response.json({ ok: true });
}
