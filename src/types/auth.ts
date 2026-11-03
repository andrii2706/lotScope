export type Role = "superadmin" | "admin" | "lead" | "manager" | "expert" | "user";

export type Permission =
  | "console"
  | "search"
  | "analyze"
  | "reports"
  | "reportsAll"
  | "save"
  | "pdf"
  | "expert"
  | "team"
  | "activity"
  | "settings";

export interface Actor {
  role: Role;
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId: string;
  companyName: string;
  teamId: string | null;
  teamName: string | null;
  isAdmin: boolean;
  companyKind: "team" | "personal";
  suspended: boolean;
  suspendedReason: string;
  sessionExpiresAt: string;
}

export interface Me {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId: string;
  companyName: string;
  teamId: string | null;
  teamName: string | null;
  isAdmin: boolean;
  companyKind: "team" | "personal";
  suspended: boolean;
  suspendedReason: string;
  sessionExpiresAt: string;
}

export type MeState = { status: "loading" } | { status: "ready"; user: Me | null; dbConfigured: boolean; dbError?: string };

export interface OAuthContext {
  state: string;
  verifier: string;
  invite: string;
  next: string;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

export interface Target {
  role: string;
  team_id: string | null;
  email: string;
}

export interface ReportScope {
  all: boolean;
  userId: string;
  teamId: string | null;
}

export interface AuditActor {
  id: string;
  name: string;
  role: string;
  companyId: string | null;
}
