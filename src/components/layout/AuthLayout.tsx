import type { CSSProperties, ReactNode } from "react";
import { ConfirmHost } from "@/components/ui/ConfirmDialog";
import { AUTH_PHOTO } from "@/config/navigation";
import { Copyright } from "./Copyright";
import { Logo } from "./Logo";

export function AuthLayout({ style, children }: { style: CSSProperties; children: ReactNode }) {
  return (
    <div style={style} className="app-bg grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="flex min-h-screen flex-col bg-surface px-6 py-7 sm:px-12">
        <Logo />
        <main className="flex flex-1 flex-col justify-center py-10">
          <div className="mx-auto w-full max-w-[420px] space-y-4">{children}</div>
        </main>
        <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="text-xs text-faint">LotScope · оцінка лотів з аукціонів США, Канади, Європи та ОАЕ</p>
          <Copyright />
        </footer>
      </div>
      <aside className="relative hidden overflow-hidden bg-[#0e1014] lg:block">
        <div aria-hidden className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${AUTH_PHOTO}")` }} />
      </aside>
      <ConfirmHost />
    </div>
  );
}
