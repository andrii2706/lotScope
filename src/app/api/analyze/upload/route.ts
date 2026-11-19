import { requireUser } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { fail } from "@/lib/server/http";
import { route } from "@/lib/server/route";
import { MAX_PENDING_UPLOADS, MAX_UPLOAD_REQUEST, UPLOAD_TTL_HOURS, parseUpload } from "@/lib/server/uploads";
import type { AnalysisUploadResponse } from "@/types/report";

async function handlePOST(request: Request) {
  const user = await requireUser("analyze");
  if (user instanceof Response) return user;
  const raw = await request.text();
  if (raw.length > MAX_UPLOAD_REQUEST) {
    return fail(413, "Файл завеликий. Збережіть звіт історії скриншотами або PDF до 3 МБ.");
  }
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return fail(400, "Не вдалося прочитати файл.");
  }
  const upload = parseUpload(input);
  if (!upload) {
    return fail(400, "Підтримуються фото JPEG, PNG, WEBP і звіти PDF.", "файл для аналізу не пройшов перевірку типу або розміру");
  }
  await query("delete from analysis_uploads where created_at < now() - make_interval(hours => $1)", [UPLOAD_TTL_HOURS]);
  const pending = await query<{ n: number }>("select count(*)::int as n from analysis_uploads where user_id = $1", [user.id]);
  if ((pending[0]?.n ?? 0) >= MAX_PENDING_UPLOADS) {
    return fail(429, "Забагато незавершених завантажень. Зачекайте кілька хвилин і спробуйте ще раз.");
  }
  const id = crypto.randomUUID();
  await query(
    "insert into analysis_uploads (id, company_id, user_id, kind, name, media_type, data) values ($1, $2, $3, $4, $5, $6, $7)",
    [id, user.companyId, user.id, upload.kind, upload.name, upload.mediaType, upload.data],
  );
  const response: AnalysisUploadResponse = { id };
  return Response.json(response);
}

export const POST = route(handlePOST);
