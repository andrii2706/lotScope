import { query } from "./db.ts";
import type { AuditActor } from "@/types/auth";

export async function audit(actor: AuditActor | null, action: string, target = "", detail = "", companyId?: string | null) {
  try {
    await query(
      "insert into audit_log (company_id, user_id, actor, role, action, target, detail) values ($1, $2, $3, $4, $5, $6, $7)",
      [companyId === undefined ? (actor?.companyId ?? null) : companyId, actor?.id ?? null, actor?.name ?? "", actor?.role ?? "", action, target.slice(0, 200), detail.slice(0, 500)],
    );
  } catch (e) {
    console.error("Audit", e instanceof Error ? e.message : e);
  }
}
