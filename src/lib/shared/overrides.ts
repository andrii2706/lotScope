import type { CostOverrides } from "@/types/report";

export function sameOverrides(a: CostOverrides, b: CostOverrides): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof CostOverrides>;
  for (const k of keys) if ((a[k] ?? null) !== (b[k] ?? null)) return false;
  return true;
}
