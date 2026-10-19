import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { parseDataUrl } from "@/lib/reports";
import { can } from "@/lib/roles";
import { fail } from "@/lib/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const user = await requireUser("reports");
  if (user instanceof Response) return user;
  const { id, n } = await params;
  const idx = Number.parseInt(n, 10);
  if (!Number.isInteger(idx) || idx < 0) return fail(404, "Фото не знайдено.");
  const rows = await query<{ data: string }>(
    `select p.data from report_photos p join reports r on r.id = p.report_id
      where p.report_id = $1 and p.idx = $2 and r.company_id = $3 and ($4::boolean or r.user_id = $5)`,
    [id, idx, user.companyId, can(user, "reportsAll"), user.id],
  );
  const parsed = rows[0] ? parseDataUrl(rows[0].data) : null;
  if (!parsed) return fail(404, "Фото не знайдено.");
  return new Response(new Uint8Array(parsed.bytes), { headers: { "content-type": parsed.type, "cache-control": "private, max-age=3600" } });
}
