import { audit } from "@/lib/audit";
import { newId, requireUser } from "@/lib/auth";
import { query, tx } from "@/lib/db";
import { MAX_REPORT_REQUEST, MAX_STORED_PHOTOS, type ReportRow, isDataUrl, rowToReport } from "@/lib/reports";
import { can } from "@/lib/roles";
import { fail } from "@/lib/server";

const LIMIT = 300;

export async function GET() {
  const user = await requireUser("reports");
  if (user instanceof Response) return user;
  const all = can(user, "reportsAll");
  const rows = await query<ReportRow>(
    `select r.id, r.user_id, u.name as author, r.body, r.created_at,
            (select count(*) from report_photos p where p.report_id = r.id)::int as photos
       from reports r left join users u on u.id = r.user_id
      where r.company_id = $1 and ($2::boolean or r.user_id = $3)
      order by r.created_at desc limit ${LIMIT}`,
    [user.companyId, all, user.id],
  );
  return Response.json({ reports: rows.map(rowToReport), canSave: can(user, "save") });
}

export async function POST(request: Request) {
  const user = await requireUser("save");
  if (user instanceof Response) return user;
  const raw = await request.text();
  if (raw.length > MAX_REPORT_REQUEST) return fail(413, "Звіт завеликий для збереження. Спробуйте з меншою кількістю фото.");
  let input: Record<string, unknown>;
  try {
    input = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return fail(400, "Не вдалося прочитати звіт.");
  }
  const lot = input.lot as Record<string, unknown> | undefined;
  if (!lot || typeof lot !== "object" || !input.analysis || typeof input.analysis !== "object") return fail(400, "Звіт неповний.");
  const photos = Array.isArray(input.photos) ? input.photos.filter(isDataUrl).slice(0, MAX_STORED_PHOTOS) : [];
  const title = [lot.year, lot.make, lot.model].filter((v) => v !== undefined && v !== null && v !== "").join(" ").slice(0, 200);
  const vin = typeof lot.vin === "string" ? lot.vin.slice(0, 40) : "";
  const body = {
    lot,
    analysis: input.analysis,
    overrides: input.overrides && typeof input.overrides === "object" ? input.overrides : {},
    demo: input.demo === true,
    model: typeof input.model === "string" ? input.model.slice(0, 80) : "",
    comparables: input.comparables ?? null,
    historyFiles: Array.isArray(input.historyFiles) ? input.historyFiles.filter((v) => typeof v === "string").slice(0, 10) : [],
    vinHistory: input.vinHistory ?? null,
  };
  const id = newId();
  await tx(async (c) => {
    await c.query("insert into reports (id, company_id, user_id, title, vin, body) values ($1, $2, $3, $4, $5, $6)", [id, user.companyId, user.id, title, vin, JSON.stringify(body)]);
    for (const [i, data] of photos.entries()) {
      await c.query("insert into report_photos (report_id, idx, data) values ($1, $2, $3)", [id, i, data]);
    }
  });
  await audit(user, "report_save", title || id, vin);
  const rows = await query<ReportRow>(
    "select r.id, r.user_id, u.name as author, r.body, r.created_at, $2::int as photos from reports r left join users u on u.id = r.user_id where r.id = $1",
    [id, photos.length],
  );
  return Response.json({ report: rowToReport(rows[0]) });
}
