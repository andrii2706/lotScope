import { Activity, FileText, Plus, Search, Settings2, ShieldCheck, Users, Wrench } from "lucide-react";
import type { NavItem } from "@/types/ui";

export const BARE_PATHS = ["/login", "/invite", "/forgot-password", "/reset-password"];

export const AUTH_PHOTO = "https://images.unsplash.com/photo-1734946026733-0c31b42d970f?fm=jpg&q=70&w=1800&auto=format&fit=crop";

export const NAV: NavItem[] = [
  { href: "/admin", label: "Консоль", icon: ShieldCheck, permission: "console" },
  { href: "/activity", label: "Активність", icon: Activity, permission: "activity" },
  { href: "/", label: "Новий аналіз", icon: Plus, permission: "analyze" },
  { href: "/search", label: "Пошук лотів", icon: Search, permission: "search" },
  { href: "/history", label: "Звіти", icon: FileText, permission: "reports" },
  { href: "/expert", label: "Експерт СТО", icon: Wrench, permission: "expert" },
  { href: "/team", label: "Команда", icon: Users, permission: "team" },
  { href: "/settings", label: "Налаштування", icon: Settings2, permission: "settings" },
];

export function isBarePath(pathname: string): boolean {
  return BARE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href) || (href === "/history" && pathname.startsWith("/report"));
}
