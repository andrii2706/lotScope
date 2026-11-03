import type { Report } from "@/types/report";

export function expertStats(reports: Report[]) {
  const reviewed = reports.filter((r) => r.expert);
  const parts = reviewed.flatMap((r) => r.expert!.parts.filter((p) => p.agree !== null));
  const agreed = parts.filter((p) => p.agree).length;
  const ranges = reviewed.filter((r) => r.expert!.repairMaxUsd > 0 && r.analysis.repairMaxUsd > 0);
  const deviation = ranges.length
    ? ranges.reduce((sum, r) => {
        const ai = (r.analysis.repairMinUsd + r.analysis.repairMaxUsd) / 2;
        const ex = (r.expert!.repairMinUsd + r.expert!.repairMaxUsd) / 2;
        return sum + (ai - ex) / ex;
      }, 0) / ranges.length
    : null;
  const verdicts = reviewed.filter((r) => r.expert!.verdict);
  const verdictMatch = verdicts.length
    ? verdicts.filter((r) => r.expert!.verdict === r.analysis.verdict).length / verdicts.length
    : null;
  return {
    reviewed: reviewed.length,
    agreement: parts.length ? agreed / parts.length : null,
    deviation,
    verdictMatch,
    pending: reports.filter((r) => !r.expert && !r.demo),
  };
}

export const pct = (v: number | null, signed = false) =>
  v === null ? "—" : `${signed && v > 0 ? "+" : ""}${Math.round(v * 100)}%`;
