import { audit } from "@/lib/server/audit";
import { requireUser } from "@/lib/server/auth";
import { query, tx } from "@/lib/server/db";
import { MAX_HISTORY_DOCS, MAX_HISTORY_DOC_CHARS, parseHistoryDoc } from "@/lib/server/reports";
import { fail, text } from "@/lib/server/http";
import { route } from "@/lib/server/route";
import type { StoredHistoryDoc } from "@/types/report";

async function handlePOST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("save");
  if (user instanceof Response) return user;
  const id = text((await params).id, 40);
  const raw = await request.text();
  if (raw.length > MAX_HISTORY_DOC_CHARS + 2000) return fail(413, "Файл завеликий. Збережіть звіт історії скриншотами або PDF до 3 МБ.");
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return fail(400, "Не вдалося прочитати файл.");
  }
  const doc = parseHistoryDoc(input);
  if (!doc) return fail(400, "Підтримуються PDF і зображення.", "файл історії не пройшов перевірку типу або розміру");
  const rows = await query<{ user_id: string | null; title: string }>("select user_id, title from reports where id = $1 and company_id = $2", [id, user.companyId]);
  const report = rows[0];
  if (!report) return fail(404, "Звіт не знайдено.");
  if (report.user_id !== user.id) return fail(403, "Додати файл може лише автор звіту.");
  const stored = await tx(async (c) => {
    const lock = await c.query<{ n: number }>("select count(*)::int as n from report_files where report_id = $1", [id]);
    const n = lock.rows[0]?.n ?? 0;
    if (n >= MAX_HISTORY_DOCS) return null;
    const meta: StoredHistoryDoc = { n, name: doc.name, mediaType: doc.mediaType };
    await c.query("insert into report_files (report_id, idx, name, media_type, data) values ($1, $2, $3, $4, $5)", [id, n, doc.name, doc.mediaType, doc.data]);
    await c.query(
      "update reports set body = jsonb_set(body, '{historyDocs}', coalesce(body->'historyDocs', '[]'::jsonb) || $2::jsonb) where id = $1",
      [id, JSON.stringify([meta])],
    );
    return meta;
  });
  if (!stored) return fail(409, `До звіту можна додати не більше ${MAX_HISTORY_DOCS} файлів.`);
  await audit(user, "report_file", report.title || id, doc.name);
  return Response.json({ doc: { name: stored.name, mediaType: stored.mediaType, url: `/api/reports/${id}/file/${stored.n}` } });
}

export const POST = route(handlePOST);
