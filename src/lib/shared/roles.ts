import type { Actor, Permission, Role } from "@/types/auth";
export const ROLES: Role[] = ["superadmin", "admin", "lead", "manager", "expert", "user"];

const MATRIX: Record<Role, Permission[]> = {
  superadmin: ["console", "search", "analyze", "reports", "reportsAll", "save", "pdf", "expert", "settings"],
  admin: ["reports", "reportsAll", "team", "activity", "settings"],
  lead: ["search", "analyze", "reports", "save", "pdf", "team", "activity"],
  manager: ["search", "analyze", "reports", "save", "pdf"],
  expert: ["reports", "reportsAll", "expert"],
  user: ["search", "analyze", "reports", "save", "pdf", "settings"],
};

export function can(actor: Actor | null | undefined, permission: Permission): boolean {
  return Boolean(actor && MATRIX[actor.role].includes(permission));
}

export function allows(role: Role, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: "Супер адмін",
  admin: "Адмін компанії",
  lead: "Керівник команди",
  manager: "Менеджер з пошуку",
  expert: "Технічний спеціаліст СТО",
  user: "Користувач",
};

export const ROLE_HINT: Record<Role, string> = {
  superadmin: "Створює та видаляє компанії й профілі, бачить журнал дій.",
  admin: "Створює команди, призначає керівників, запрошує та видаляє людей, бачить усі звіти й дії компанії.",
  lead: "Шукає й аналізує лоти, бачить звіти та дії менеджерів своєї команди, запрошує й вимикає їх.",
  manager: "Шукає лоти, робить аналіз, зберігає звіти та формує PDF.",
  expert: "Перевіряє звіти й навчає AI-агента уроками.",
  user: "Шукає лоти, робить аналіз, зберігає звіти та формує PDF.",
};

export const INVITABLE_BY_ADMIN: Role[] = ["lead", "manager", "expert"];
export const INVITABLE_BY_LEAD: Role[] = ["manager"];
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
