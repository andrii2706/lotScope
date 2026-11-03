"use client";

import { CircleAlert, CircleCheck, Info } from "lucide-react";
import type { ReactNode } from "react";

export function Notice({
  tone,
  title,
  children,
}: {
  tone: "warn" | "bad" | "good" | "info";
  title?: string;
  children: ReactNode;
}) {
  const styles = {
    warn: "border-warn/25 bg-warn-bg text-warn",
    bad: "border-bad/25 bg-bad-bg text-bad",
    good: "border-good/25 bg-good-bg text-good",
    info: "border-line bg-surface text-accent-text",
  }[tone];
  const Icon = { warn: CircleAlert, bad: CircleAlert, good: CircleCheck, info: Info }[tone];
  return (
    <div role="status" className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${styles}`}>
      <Icon className="mt-0.5 size-5 shrink-0" strokeWidth={2.2} />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <div className="leading-relaxed text-ink/80">{children}</div>
      </div>
    </div>
  );
}
