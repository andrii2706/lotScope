"use client";

import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-7">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-faint">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold leading-tight tracking-[-0.02em] sm:text-[28px]">
          {title}
        </h1>
        {description && <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
