import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { text } from "@/lib/server";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("pdf");
  if (user instanceof Response) return user;
  const { id } = await params;
  const rows = await query<{ title: string }>("select title from reports where id = $1 and company_id = $2 and user_id = $3", [text(id, 40), user.companyId, user.id]);
  if (rows[0]) await audit(user, "report_pdf", rows[0].title || id);
  return Response.json({ ok: true });
}
