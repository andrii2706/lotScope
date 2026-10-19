"use client";

import { ACTION_LABEL } from "@/lib/audit-labels";
import { ROLE_LABEL } from "@/lib/roles";
import type { Role } from "@/lib/roles";

export interface AuditEntry {
  id: string;
  actor: string;
  role: string;
  action: string;
  target: string;
  detail: string;
  created_at: string;
  company_name?: string | null;
}

export const stamp = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export function AuditList({ entries, showCompany = false }: { entries: AuditEntry[]; showCompany?: boolean }) {
  if (entries.length === 0) return <p className="p-5 text-sm text-muted">Подій ще немає.</p>;
  return (
    <ul>
      {entries.map((e) => (
        <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-line px-4 py-3 text-sm last:border-b-0 sm:px-5">
          <span className="w-36 shrink-0 tabular-nums text-xs text-muted">{stamp(e.created_at)}</span>
          <span className="min-w-0 flex-1">
            <span className="font-bold">{ACTION_LABEL[e.action] ?? e.action}</span>
            {e.target && <span className="text-muted"> · {e.target}</span>}
            {e.detail && <span className="text-faint"> · {e.detail}</span>}
          </span>
          <span className="text-xs text-muted">
            {e.actor || "система"}
            {e.role && ` · ${ROLE_LABEL[e.role as Role] ?? e.role}`}
            {showCompany && e.company_name ? ` · ${e.company_name}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
