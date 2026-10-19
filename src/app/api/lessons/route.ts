import { newId, requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { LESSON_TAGS } from "@/lib/lessons";
import { fail, readJson, text } from "@/lib/server";
import type { Lesson } from "@/lib/types";

interface Row {
  id: string;
  rule: string;
  tag: string;
  report_id: string;
  report_title: string;
  expert: string;
  active: boolean;
  created_at: Date;
}

const toLesson = (r: Row): Lesson => ({
  id: r.id,
  rule: r.rule,
  tag: r.tag,
  reportId: r.report_id,
  reportTitle: r.report_title,
  expert: r.expert,
  active: r.active,
  createdAt: r.created_at.toISOString(),
});

export async function GET() {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const rows = await query<Row>("select * from lessons where company_id = $1 order by created_at desc", [user.companyId]);
  return Response.json({ lessons: rows.map(toLesson) });
}

export async function POST(request: Request) {
  const user = await requireUser("expert");
  if (user instanceof Response) return user;
  const body = await readJson<Partial<Lesson>>(request);
  const rule = text(body?.rule, 600);
  if (!rule) return fail(400, "Урок не може бути порожнім.");
  const tag = LESSON_TAGS.includes(text(body?.tag, 40)) ? text(body?.tag, 40) : LESSON_TAGS[LESSON_TAGS.length - 1];
  const reportId = text(body?.reportId, 40);
  const id = reportId ? `r-${user.companyId.slice(0, 6)}-${reportId}` : newId();
  const rows = await query<Row>(
    `insert into lessons (id, company_id, rule, tag, report_id, report_title, expert, active)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (id) do update set rule = excluded.rule, tag = excluded.tag, expert = excluded.expert,
       active = excluded.active, report_title = excluded.report_title
     where lessons.company_id = excluded.company_id
     returning *`,
    [id, user.companyId, rule, tag, reportId, text(body?.reportTitle, 200), text(body?.expert, 120) || user.name, body?.active !== false],
  );
  if (!rows[0]) return fail(403, "Недостатньо прав для цієї дії.");
  return Response.json({ lesson: toLesson(rows[0]) });
}

export async function PATCH(request: Request) {
  const user = await requireUser("expert");
  if (user instanceof Response) return user;
  const body = await readJson<{ id?: string; active?: boolean }>(request);
  await query("update lessons set active = $3 where id = $1 and company_id = $2", [text(body?.id, 80), user.companyId, body?.active === true]);
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await requireUser("expert");
  if (user instanceof Response) return user;
  const body = await readJson<{ id?: string; reportId?: string }>(request);
  const id = body?.reportId ? `r-${user.companyId.slice(0, 6)}-${text(body.reportId, 40)}` : text(body?.id, 80);
  await query("delete from lessons where id = $1 and company_id = $2", [id, user.companyId]);
  return Response.json({ ok: true });
}
