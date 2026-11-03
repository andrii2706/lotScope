"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { ConfirmHost } from "@/components/ui/ConfirmDialog";
import { Notice } from "@/components/ui";
import { NAV, isBarePath } from "@/config/navigation";
import { refreshMe, useMe } from "@/lib/client/me";
import { saveSettings, useSettings } from "@/lib/client/store";
import { useResolvedTheme } from "@/lib/client/theme";
import { accentInk, accentText } from "@/lib/shared/color";
import { allows, homeFor, routePermission } from "@/lib/shared/roles";
import { AuthLayout } from "./AuthLayout";
import { MobileNav } from "./MobileNav";
import { NavList } from "./NavList";
import { Sidebar } from "./Sidebar";
import { UserBlock, UserBlockSkeleton } from "./UserBlock";

const RETRY_MS = 5000;

export function AppShell({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const theme = useResolvedTheme(settings.theme);
  const me = useMe();
  const bare = isBarePath(pathname);
  const loading = me.status === "loading";
  const user = me.status === "ready" ? me.user : null;
  const failed = me.status === "ready" && !user && Boolean(me.dbError);
  const signedOut = me.status === "ready" && !user && !me.dbError;
  const nav = user ? NAV.filter((n) => allows(user.role, n.permission)) : [];
  const required = routePermission(pathname);
  const forbidden = Boolean(user && !bare && required && !allows(user.role, required));
  const expiresAt = user ? Date.parse(user.sessionExpiresAt) : 0;

  useEffect(() => {
    if (user && forbidden) router.replace(homeFor(user.role));
  }, [user, forbidden, router]);

  useEffect(() => {
    if (!bare && signedOut) window.location.replace(new URL(`/login?error=session&next=${encodeURIComponent(pathname)}`, window.location.origin).href);
  }, [bare, signedOut, pathname]);

  useEffect(() => {
    if (!failed) return;
    const timer = setTimeout(() => void refreshMe(), RETRY_MS);
    return () => clearTimeout(timer);
  }, [failed, me]);

  useEffect(() => {
    if (!expiresAt) return;
    const timer = setInterval(() => {
      if (Date.now() >= expiresAt) window.location.replace(new URL("/login?error=session", window.location.origin).href);
    }, 15_000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const style = {
    "--accent": settings.accentColor,
    "--accent-ink": accentInk(settings.accentColor),
    "--accent-text": accentText(settings.accentColor, theme),
  } as CSSProperties;

  if (bare) return <AuthLayout style={style}>{children}</AuthLayout>;

  const toggleTheme = () => saveSettings({ ...settings, theme: theme === "dark" ? "light" : "dark" });
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    await refreshMe();
    window.location.replace(new URL("/login", window.location.origin).href);
  };
  const account = user ? <UserBlock user={user} theme={theme} onToggleTheme={toggleTheme} onLogout={logout} /> : <UserBlockSkeleton />;
  const navFor = (onPick?: () => void) => <NavList items={nav} pathname={pathname} loading={!user} onPick={onPick} />;

  return (
    <div style={style} className="app-bg min-h-screen lg:flex">
      <Sidebar nav={navFor()} account={account} />
      <MobileNav open={menuOpen} onToggle={() => setMenuOpen((v) => !v)} nav={navFor(() => setMenuOpen(false))} account={account} />

      <main className="min-w-0 flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-8">
        <div className="mx-auto max-w-[1180px]">
          {failed ? (
            <Notice tone="warn" title="Не вдалося завантажити дані">
              {me.status === "ready" && me.dbError} Повторюю спробу автоматично.
            </Notice>
          ) : user?.suspended ? (
            <div className="card mx-auto max-w-lg p-8 text-center">
              <h1 className="text-xl font-bold">Доступ призупинено</h1>
              <p className="mt-2 text-sm text-muted">
                Доступ вашої компанії до LotScope тимчасово вимкнено.{user.suspendedReason ? ` ${user.suspendedReason}` : ""} Зверніться до адміністратора сервісу.
              </p>
            </div>
          ) : forbidden || loading || signedOut ? null : (
            children
          )}
        </div>
      </main>
      <ConfirmHost />
    </div>
  );
}
