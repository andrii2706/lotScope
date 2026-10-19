"use client";

import { Activity, CreditCard, LogOut, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ROLE_LABEL, refreshMe, useMe } from "@/lib/me";
import { allows } from "@/lib/roles";

export function UserMenu() {
  const me = useMe();
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  if (me.status === "loading" || !me.user) return null;
  const u = me.user;
  const low = u.credits <= 3;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await refreshMe();
    window.location.replace(new URL("/login", window.location.origin).href);
  }

  return (
    <details ref={ref} className="relative">
      <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-sm font-bold [&::-webkit-details-marker]:hidden">
        <span className="grid size-8 place-items-center rounded-full bg-panel2 text-xs font-extrabold ring-1 ring-line2">
          {u.name.trim().charAt(0).toUpperCase()}
        </span>
        {u.role !== "superadmin" && (
          <span className={`tabular-nums ${low ? "text-warn" : "text-ink"}`} title="Залишок аналізів">
            {u.credits}
          </span>
        )}
        <span className="sr-only">аналізів залишилось, меню акаунта</span>
      </summary>
      <div className="absolute right-0 z-40 mt-2 w-72 rounded-2xl border border-line2 bg-surface p-2 shadow-pop">
        <div className="px-3 py-2.5">
          <p className="truncate font-extrabold">{u.name}</p>
          <p className="truncate text-xs text-muted">{u.email}</p>
          <p className="mt-1 truncate text-xs text-muted">
            {u.role === "superadmin" ? "LotScope" : u.companyKind === "personal" ? "Особистий акаунт" : u.companyName} · {ROLE_LABEL[u.role]}
          </p>
        </div>
        {u.role !== "superadmin" && (
          <Link
            href={allows(u.role, "billing") ? "/billing" : "#"}
            onClick={() => ref.current?.removeAttribute("open")}
            className={`mx-1 mb-1 flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold ${low ? "bg-warn-bg text-warn" : "bg-panel2"}`}
          >
            <span>Аналізів залишилось</span>
            <span className="tabular-nums">{u.credits}</span>
          </Link>
        )}
        {[
          { href: "/billing", label: "Тариф і оплата", icon: CreditCard, show: allows(u.role, "billing") },
          { href: "/team", label: "Команда", icon: Users, show: allows(u.role, "team") },
          { href: "/activity", label: "Активність", icon: Activity, show: allows(u.role, "activity") },
          { href: "/admin", label: "Консоль супер адміна", icon: ShieldCheck, show: allows(u.role, "console") },
        ]
          .filter((i) => i.show)
          .map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => ref.current?.removeAttribute("open")}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-panel2"
            >
              <Icon className="size-4 text-muted" /> {label}
            </Link>
          ))}
        <button type="button" onClick={logout} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-bad hover:bg-bad-bg">
          <LogOut className="size-4" /> Вийти
        </button>
      </div>
    </details>
  );
}
