import type { Role } from "./auth";

export type CompanyKind = "team" | "personal";

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

export interface CompanyRow {
  id: string;
  name: string;
  suspended: boolean;
  users: string;
  active_users: string;
  analyses: string;
  reports: string;
  last_seen: string | null;
  created_at: string;
}

export interface AdminOverview {
  companies: CompanyRow[];
  totals: { teams: string; personal: string; users: string; analyses: string; suspended: string };
  kind: CompanyKind;
}

export interface CompanyMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  google: boolean;
  created_at: string;
  team: string | null;
  analyses: string;
  reports: string;
  last_seen: string | null;
}

export interface CompanyDetail {
  company: { id: string; name: string; kind: CompanyKind; created_at: string };
  members: CompanyMember[];
  invites: { role: string; expires_at: string }[];
  log: AuditEntry[];
  stats: { month: string; analyses: string; unlocks: string; reports: string; pdfs: string };
}
