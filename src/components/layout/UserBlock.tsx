"use client";

import { LogOut, Moon, Sun } from "lucide-react";
import { ROLE_LABEL } from "@/lib/shared/roles";
import type { Me } from "@/types/auth";

export function UserBlock({ user, theme, onToggleTheme, onLogout }: { user: Me; theme: "light" | "dark"; onToggleTheme: () => void; onLogout: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5 px-1">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-panel2 text-[13px] font-semibold ring-1 ring-line">
          {user.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[13px] font-semibold">{user.name}</span>
          <span className="block truncate text-xs text-faint">
            {user.role === "superadmin" ? ROLE_LABEL[user.role] : `${user.companyName} · ${ROLE_LABEL[user.role]}`}
          </span>
        </span>
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Увімкнути світлу тему" : "Увімкнути темну тему"}
          title={theme === "dark" ? "Світла тема" : "Темна тема"}
          className="grid size-9 place-items-center rounded-lg border border-line text-muted transition hover:bg-panel2 hover:text-ink"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-line text-sm font-medium text-muted transition hover:bg-bad-bg hover:text-bad"
        >
          <LogOut className="size-4" /> Вийти
        </button>
      </div>
    </div>
  );
}

export function UserBlockSkeleton() {
  return (
    <div aria-hidden className="flex items-center gap-2.5 px-1">
      <span className="size-8 rounded-full bg-panel2" />
      <span className="flex-1 space-y-1.5">
        <span className="block h-3 w-24 rounded bg-panel2" />
        <span className="block h-2.5 w-32 rounded bg-panel2" />
      </span>
    </div>
  );
}
