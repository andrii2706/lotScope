import { query } from "@/lib/db";
import { requireSuperadmin } from "@/lib/superadmin";

const PAGE = 100;

export async function GET(request: Request) {
  const admin = await requireSuperadmin();
  if (admin instanceof Response) return admin;
  const url = new URL(request.url);
  const companyId = url.searchParams.get("company") || "";
  const action = url.searchParams.get("action") || "";
  const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0);
  const rows = await query<{ id: string; company_name: string | null; actor: string; role: string; action: string; target: string; detail: string; created_at: Date }>(
    `select a.id::text, c.name as company_name, a.actor, a.role, a.action, a.target, a.detail, a.created_at
       from audit_log a left join companies c on c.id = a.company_id
      where ($1 = '' or a.company_id = $1) and ($2 = '' or a.action = $2)
      order by a.created_at desc, a.id desc limit ${PAGE} offset $3`,
    [companyId, action, offset],
  );
  return Response.json({ entries: rows, next: rows.length === PAGE ? offset + PAGE : null });
}
