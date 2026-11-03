import { requireUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { parseDataUrl } from "@/lib/server/reports";
import { reportScope, reportScopeParams, reportScopeSql } from "@/lib/server/scope";
import { fail } from "@/lib/server/http";
import { route } from "@/lib/server/route";

async function handleGET(_request: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const user = await requireUser("reports");
  if (user instanceof Response) return user;
  const { id, n } = await params;
  const idx = Number.parseInt(n, 10);
  if (!Number.isInteger(idx) || idx < 0) return fail(404, "Фото не знайдено.");
  const rows = await query<{ data: string }>(
    `select p.data from report_photos p join reports r on r.id = p.report_id
      where p.report_id = $1 and p.idx = $2 and r.company_id = $3 and ${reportScopeSql("r", 4)}`,
    [id, idx, user.companyId, ...reportScopeParams(reportScope(user))],
  );
  const parsed = rows[0] ? parseDataUrl(rows[0].data) : null;
  if (!parsed) return fail(404, "Фото не знайдено.");
  return new Response(new Uint8Array(parsed.bytes), { headers: { "content-type": parsed.type, "cache-control": "private, max-age=3600" } });
}

export const GET = route(handleGET);
