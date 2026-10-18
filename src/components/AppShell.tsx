"use client";

import { Activity, History, Moon, ScanSearch, Search, Settings2, ShieldCheck, Sparkles, Sun, Users, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import { accentInk, accentText } from "@/lib/color";
import { useMe } from "@/lib/me";
import { allows, homeFor, routePermission, type Permission } from "@/lib/roles";
import { saveSettings, useSettings } from "@/lib/store";
import { useResolvedTheme } from "@/lib/theme";
import { UserMenu } from "./UserMenu";

const BARE = ["/login", "/register", "/invite"];

const NAV: { href: string; label: string; short: string; icon: typeof Search; permission: Permission }[] = [
  { href: "/admin", label: "Консоль", short: "Консоль", icon: ShieldCheck, permission: "console" },
  { href: "/activity", label: "Активність", short: "Активність", icon: Activity, permission: "activity" },
  { href: "/team", label: "Команда", short: "Команда", icon: Users, permission: "team" },
  { href: "/search", label: "Пошук лотів", short: "Пошук", icon: Search, permission: "search" },
  { href: "/", label: "Новий аналіз", short: "Аналіз", icon: Sparkles, permission: "analyze" },
  { href: "/history", label: "Звіти", short: "Звіти", icon: History, permission: "reports" },
  { href: "/expert", label: "Експерт СТО", short: "Експерт", icon: Wrench, permission: "expert" },
  { href: "/settings", label: "Налаштування", short: "Компанія", icon: Settings2, permission: "settings" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const pathname = usePathname();
  const theme = useResolvedTheme(settings.theme);
  const bare = BARE.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const router = useRouter();
  const me = useMe();
  const user = me.status === "ready" ? me.user : null;
  const nav = user ? NAV.filter((n) => allows(user.role, n.permission)) : [];
  const required = routePermission(pathname);
  const forbidden = Boolean(user && !bare && required && !allows(user.role, required));
  const expiresAt = user ? Date.parse(user.sessionExpiresAt) : 0;

  useEffect(() => {
    if (user && forbidden) router.replace(homeFor(user.role));
  }, [user, forbidden, router]);

  useEffect(() => {
    if (!expiresAt) return;
    const timer = setInterval(() => {
      if (Date.now() >= expiresAt) window.location.replace(new URL("/login?error=session", window.location.origin).href);
    }, 15_000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  const toggleTheme = () =>
    saveSettings({ ...settings, theme: theme === "dark" ? "light" : "dark" });

  return (
    <div
      style={
        {
          "--accent": settings.accentColor,
          "--accent-ink": accentInk(settings.accentColor),
          "--accent-text": accentText(settings.accentColor, theme),
        } as CSSProperties
      }
      className="app-bg min-h-screen"
    >
      <header className="no-print sticky top-0 z-30 border-b border-line bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span
              aria-hidden
              className="grid size-9 place-items-center rounded-xl bg-accent text-accent-ink"
            >
              <ScanSearch className="size-5" strokeWidth={2.2} />
            </span>
            <span className="hidden font-display text-[15px] font-semibold tracking-tight sm:block">
              LotScope
            </span>
          </Link>

          <nav hidden={bare || nav.length === 0} className="flex min-w-0 items-center gap-0.5 overflow-x-auto rounded-full border border-line bg-surface p-1 text-sm font-bold">
            {nav.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href) ||
                    (item.href === "/history" && pathname.startsWith("/report"));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-colors lg:px-4 ${
                    active ? "bg-panel2 text-ink ring-1 ring-line2" : "text-muted hover:text-ink"
                  }`}
                >
                  <Icon className="size-4" strokeWidth={2.2} />
                  <span className="hidden xl:inline">{item.label}</span>
                  <span className="hidden md:inline xl:hidden">{item.short}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {!bare && <UserMenu />}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Увімкнути світлу тему" : "Увімкнути темну тему"}
              title={theme === "dark" ? "Світла тема" : "Темна тема"}
              className="grid size-10 place-items-center rounded-full border border-line bg-surface text-muted transition hover:text-ink"
            >
              {theme === "dark" ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
        {user?.suspended && !bare ? (
          <div className="card mx-auto max-w-lg p-8 text-center">
            <h1 className="text-xl font-extrabold">Доступ призупинено</h1>
            <p className="mt-2 text-sm text-muted">
              Доступ вашої компанії до LotScope тимчасово вимкнено.{user.suspendedReason ? ` ${user.suspendedReason}` : ""} Зверніться до адміністратора сервісу.
            </p>
          </div>
        ) : forbidden ? null : (
          children
        )}
      </main>
    </div>
  );
}
