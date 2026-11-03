import type { ReactNode } from "react";
import { Logo } from "./Logo";

export function Sidebar({ nav, account }: { nav: ReactNode; account: ReactNode }) {
  return (
    <aside className="no-print sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col gap-6 border-r border-line bg-surface px-4 py-5 lg:flex">
      <Logo />
      <nav aria-label="Основна навігація" className="min-h-0 flex-1 overflow-y-auto">
        {nav}
      </nav>
      {account}
    </aside>
  );
}
