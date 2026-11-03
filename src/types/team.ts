import type { AuditEntry } from "./admin";
import type { Role } from "./auth";

export type InviteRole = "lead" | "manager" | "expert";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  google: boolean;
  created_at: string;
  team_id: string | null;
  analyses: string;
}

export interface TeamRef {
  id: string;
  name: string;
}

export interface TeamData {
  members: TeamMember[];
  teams: TeamRef[];
  invites: { role: string; team_id: string | null; expires_at: string }[];
  companyName: string;
  lead: boolean;
  teamId: string | null;
}

export interface ActivityMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  last_seen: string | null;
  last_login: string | null;
  analyses: string;
  unlocks: string;
  saved: string;
  pdfs: string;
  logins: string;
}

export interface ActivityData {
  members: ActivityMember[];
  log: (AuditEntry & { user_id: string | null })[];
}
