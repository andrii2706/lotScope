import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { text } from "@/lib/server";

export async function GET(request: Request) {
  const user = await requireUser("activity");
  if (user instanceof Response) return user;
  const userId = text(new URL(request.url).searchParams.get("user"), 40);
  const members = await query<{ id: string; name: string; email: string; role: string; active: boolean; last_seen: Date | null; last_login: Date | null; analyses: string; unlocks: string; saved: string; pdfs: string; logins: string }>(
    `select u.id, u.name, u.email, u.role, u.active,
            (select max(a.created_at) from audit_log a where a.user_id = u.id) as last_seen,
            (select max(a.created_at) from audit_log a where a.user_id = u.id and a.action = 'login') as last_login,
            (select count(*) from audit_log a where a.user_id = u.id and a.action = 'analyze' and a.created_at >= date_trunc('month', now()))::text as analyses,
            (select count(*) from audit_log a where a.user_id = u.id and a.action = 'unlock' and a.created_at >= date_trunc('month', now()))::text as unlocks,
            (select count(*) from audit_log a where a.user_id = u.id and a.action = 'report_save' and a.created_at >= date_trunc('month', now()))::text as saved,
            (select count(*) from audit_log a where a.user_id = u.id and a.action = 'report_pdf' and a.created_at >= date_trunc('month', now()))::text as pdfs,
            (select count(*) from audit_log a where a.user_id = u.id and a.action in ('login', 'invite_accept', 'register') and a.created_at >= date_trunc('month', now()))::text as logins
       from users u where u.company_id = $1 order by u.role, u.name`,
    [user.companyId],
  );
  const log = await query<{ id: string; user_id: string | null; actor: string; role: string; action: string; target: string; detail: string; created_at: Date }>(
    `select id::text, user_id, actor, role, action, target, detail, created_at from audit_log
      where company_id = $1 and ($2 = '' or user_id = $2) order by created_at desc, id desc limit 150`,
    [user.companyId, userId],
  );
  return Response.json({ members, log });
}
