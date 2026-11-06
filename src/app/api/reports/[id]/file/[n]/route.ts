import { requireUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { reportScope, reportScopeParams, reportScopeSql } from "@/lib/server/scope";
import { fail } from "@/lib/server/http";
import { isHistoryMediaType } from "@/lib/server/reports";
import { route } from "@/lib/server/route";

async function handleGET(_request: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const user = await requireUser("reports");
  if (user instanceof Response) return user;
  const { id, n } = await params;
  const idx = Number.parseInt(n, 10);
  if (!Number.isInteger(idx) || idx < 0) return fail(404, "Файл не знайдено.");
  const rows = await query<{ name: string; media_type: string; data: string }>(
    `select f.name, f.media_type, f.data from report_files f join reports r on r.id = f.report_id
      where f.report_id = $1 and f.idx = $2 and r.company_id = $3 and ${reportScopeSql("r", 4)}`,
    [id, idx, user.companyId, ...reportScopeParams(reportScope(user))],
  );
  const row = rows[0];
  if (!row || !isHistoryMediaType(row.media_type)) return fail(404, "Файл не знайдено.");
  const bytes = Buffer.from(row.data, "base64");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": row.media_type,
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.name)}`,
      "x-content-type-options": "nosniff",
      "cache-control": "private, max-age=3600",
    },
  });
}

export const GET = route(handleGET);
