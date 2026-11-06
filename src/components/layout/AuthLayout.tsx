import type { CSSProperties, ReactNode } from "react";
import { ConfirmHost } from "@/components/ui/ConfirmDialog";
import { AUTH_PHOTO } from "@/config/navigation";
import { Logo } from "./Logo";

export function AuthLayout({ style, children }: { style: CSSProperties; children: ReactNode }) {
  return (
    <div style={style} className="app-bg grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="flex min-h-screen flex-col bg-surface px-6 py-7 sm:px-12">
        <Logo />
        <main className="flex flex-1 flex-col justify-center py-10">
          <div className="mx-auto w-full max-w-[420px] space-y-4">{children}</div>
        </main>
        <p className="text-xs text-faint">LotScope · оцінка лотів з аукціонів США, Канади, Європи та ОАЕ</p>
      </div>
      <aside className="relative hidden overflow-hidden bg-[#0e1014] lg:block">
        <img src={AUTH_PHOTO} alt="" className="absolute inset-0 size-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,16,0.15)_0%,rgba(10,12,16,0.25)_45%,rgba(10,12,16,0.85)_100%)]" />
        <div className="absolute inset-x-12 bottom-12 max-w-lg text-white">
          <p className="text-[32px] font-bold leading-tight tracking-[-0.02em]">Тисячі лотів щодня. Ви бачите, які з них варті ставки.</p>
          <p className="mt-3 text-[15px] text-white/80">ШІ-оцінка пошкоджень за фото, ціна під ключ і максимальна ставка для вашого клієнта.</p>
        </div>
      </aside>
      <ConfirmHost />
    </div>
  );
}
