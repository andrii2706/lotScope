export type Role = "superadmin" | "admin" | "manager" | "expert" | "user";

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
  | "billing"
  | "settings";

export const ROLES: Role[] = ["superadmin", "admin", "manager", "expert", "user"];

const MATRIX: Record<Role, Permission[]> = {
  superadmin: ["console"],
  admin: ["reports", "reportsAll", "team", "activity", "billing", "settings"],
  manager: ["search", "analyze", "reports", "save", "pdf"],
  expert: ["reports", "reportsAll", "expert"],
  user: ["search", "analyze", "reports", "save", "pdf", "billing", "settings"],
};

const NEEDS_SUBSCRIPTION: Permission[] = ["save", "pdf"];

export interface Actor {
  role: Role;
  subscribed: boolean;
}

export function can(actor: Actor | null | undefined, permission: Permission): boolean {
  if (!actor || !MATRIX[actor.role].includes(permission)) return false;
  return !NEEDS_SUBSCRIPTION.includes(permission) || actor.subscribed;
}

export function allows(role: Role, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: "Супер адмін",
  admin: "Адмін компанії",
  manager: "Менеджер з пошуку",
  expert: "Технічний спеціаліст СТО",
  user: "Користувач",
};

export const ROLE_HINT: Record<Role, string> = {
  superadmin: "Керує компаніями, місцями, рахунками й доступом, бачить журнал дій.",
  admin: "Відстежує дії менеджерів і їхні звіти, запрошує та видаляє користувачів компанії.",
  manager: "Шукає лоти, робить аналіз, зберігає звіти та формує PDF.",
  expert: "Перевіряє звіти й навчає AI-агента уроками.",
  user: "Шукає лоти та переглядає звіти. Збереження й PDF доступні з підпискою.",
};

export const INVITABLE_BY_ADMIN: Role[] = ["manager", "expert"];
export const INVITABLE_BY_SUPERADMIN: Role[] = ["admin", "manager", "expert"];

const ROUTES: [string, Permission][] = [
  ["/admin", "console"],
  ["/search", "search"],
  ["/history", "reports"],
  ["/report", "reports"],
  ["/expert", "expert"],
  ["/settings", "settings"],
  ["/team", "team"],
  ["/activity", "activity"],
  ["/billing", "billing"],
];

export function routePermission(pathname: string): Permission | null {
  if (pathname === "/") return "analyze";
  const hit = ROUTES.find(([p]) => pathname === p || pathname.startsWith(`${p}/`));
  return hit ? hit[1] : null;
}

export function homeFor(role: Role): string {
  switch (role) {
    case "superadmin":
      return "/admin";
    case "admin":
      return "/activity";
    case "expert":
      return "/expert";
    default:
      return "/";
  }
}
