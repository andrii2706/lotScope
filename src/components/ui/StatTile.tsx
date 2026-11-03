import type { ReactNode } from "react";

export function StatTile({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <div className="card p-5">
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className="mt-1.5 text-[28px] font-bold leading-none tracking-[-0.02em]">{value}</p>
      <p className="mt-2 text-xs text-muted">{children}</p>
    </div>
  );
}
