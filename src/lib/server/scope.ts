import { can } from "../shared/roles.ts";
import type { ReportScope, CurrentUser } from "@/types/auth";

export function reportScope(user: CurrentUser): ReportScope {
  return {
    all: can(user, "reportsAll"),
    userId: user.id,
    teamId: user.role === "lead" ? (user.teamId ?? "") : null,
  };
}

export function reportScopeSql(alias: string, from: number): string {
  return `($${from}::boolean or ${alias}.user_id = $${from + 1} or ($${from + 2}::text is not null and exists (select 1 from users m where m.id = ${alias}.user_id and m.team_id = $${from + 2})))`;
}

export function reportScopeParams(scope: ReportScope): [boolean, string, string | null] {
  return [scope.all, scope.userId, scope.teamId];
}
