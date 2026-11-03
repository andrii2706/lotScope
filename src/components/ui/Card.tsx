"use client";

import type { ReactNode } from "react";

export function Card({
  title,
  hint,
  icon,
  children,
  className = "",
  id,
}: {
  title?: string;
  hint?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`card p-5 sm:p-6 ${className}`}>
      {title && (
        <header className="mb-5 flex items-start gap-3">
          {icon && (
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-panel2 text-muted">
              {icon}
            </span>
          )}
          <div>
            <h2 className="text-base font-semibold leading-tight">{title}</h2>
            {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
          </div>
        </header>
      )}
      {children}
    </section>
  );
}
