"use client";

import Link from "next/link";
import { isActivePath } from "@/config/navigation";
import type { NavItem } from "@/types/ui";

export function NavList({ items, pathname, loading, onPick }: { items: NavItem[]; pathname: string; loading?: boolean; onPick?: () => void }) {
  if (loading) {
    return (
      <ul aria-hidden className="flex flex-col gap-1.5 px-1 pt-1">
        {[72, 60, 84, 52, 66].map((w, i) => (
          <li key={i} className="flex h-8 items-center gap-2.5 px-1.5">
            <span className="size-[18px] rounded-md bg-panel2" />
            <span className="h-3 rounded bg-panel2" style={{ width: `${w}%` }} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onPick}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                active ? "bg-panel2 font-semibold text-ink" : "font-medium text-muted hover:bg-panel2 hover:text-ink"
              }`}
            >
              <Icon className="size-[18px]" strokeWidth={1.9} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
