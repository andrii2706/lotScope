"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";

export function StepCard({
  step,
  title,
  hint,
  done,
  badge,
  children,
  id,
}: {
  step: number;
  title: string;
  hint?: string;
  done: boolean;
  badge?: "required" | "recommended" | "optional";
  children: ReactNode;
  id?: string;
}) {
  const badgeText = { required: "Обов'язково", recommended: "Рекомендовано", optional: "За бажанням" };
  return (
    <section id={id} className="card rise p-5 sm:p-6">
      <header className="mb-5 flex items-start gap-3.5">
        <span
          aria-hidden
          className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold transition-colors ${
            done ? "bg-good text-on-ink" : "bg-panel2 text-ink ring-1 ring-line"
          }`}
        >
          {done ? <Check className="size-4.5" strokeWidth={3} /> : step}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-tight">{title}</h2>
          {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
        </div>
        {badge && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
              done
                ? "bg-good-bg text-good"
                : badge === "required"
                  ? "bg-panel2 text-ink ring-1 ring-line2"
                  : "bg-panel2 text-muted"
            }`}
          >
            {done ? "Готово" : badgeText[badge]}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}
