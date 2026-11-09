"use client";

import { Menu, X } from "lucide-react";
import type { ReactNode } from "react";
import { Copyright } from "./Copyright";
import { Logo } from "./Logo";

export function MobileNav({ open, onToggle, nav, account }: { open: boolean; onToggle: () => void; nav: ReactNode; account: ReactNode }) {
  return (
    <>
      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur lg:hidden">
        <Logo />
        <button
          type="button"
          onClick={onToggle}
          aria-label={open ? "Закрити меню" : "Відкрити меню"}
          aria-expanded={open}
          className="grid size-10 place-items-center rounded-lg border border-line text-muted transition hover:text-ink"
        >
          {open ? <X className="size-[18px]" /> : <Menu className="size-[18px]" />}
        </button>
      </header>
      {open && (
        <div className="no-print fixed inset-x-0 bottom-0 top-14 z-30 flex flex-col gap-6 overflow-y-auto border-t border-line bg-surface px-4 py-4 lg:hidden">
          <nav aria-label="Основна навігація">{nav}</nav>
          <div className="mt-auto">
            {account}
            <Copyright className="mt-3 px-1" />
          </div>
        </div>
      )}
    </>
  );
}
