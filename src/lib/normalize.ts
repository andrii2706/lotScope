import type { Analysis, DamagedPart, Level, Scenario } from "./types";

const LEVELS = ["low", "medium", "high"] as const;
const VERDICTS = ["buy", "caution", "avoid"] as const;
const AIRBAGS = ["not_deployed", "deployed", "unknown"] as const;
const ACTIONS = ["replace", "repair", "paint", "inspect"] as const;
const SEVERITIES = ["minor", "moderate", "severe"] as const;

const str = (v: unknown, max = 1200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const money = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;
const list = (v: unknown, max = 12) =>
  Array.isArray(v) ? v.map((x) => str(x, 400)).filter(Boolean).slice(0, max) : [];
const range = (min: unknown, max: unknown) => {
  const a = money(min);
  const b = money(max);
  return a <= b ? ([a, b] as const) : ([b, a] as const);
};

export function normalizeAnalysis(raw: unknown): Analysis {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const damagedParts: DamagedPart[] = (Array.isArray(r.damagedParts) ? r.damagedParts : [])
    .slice(0, 30)
    .map((p: Record<string, unknown>) => {
      const [costMinUsd, costMaxUsd] = range(p?.costMinUsd, p?.costMaxUsd);
      return {
        part: str(p?.part, 200),
        action: pick(p?.action, ACTIONS, "inspect"),
        severity: pick(p?.severity, SEVERITIES, "moderate"),
        confidence: pick<Level>(p?.confidence, LEVELS, "medium"),
        costMinUsd,
        costMaxUsd,
        note: str(p?.note, 400),
      };
    })
    .filter((p: DamagedPart) => p.part);

  const scenarios: Scenario[] = (Array.isArray(r.scenarios) ? r.scenarios : [])
    .slice(0, 4)
    .map((s: Record<string, unknown>) => {
      const [repairMinUsd, repairMaxUsd] = range(s?.repairMinUsd, s?.repairMaxUsd);
      return {
        name: str(s?.name, 120),
        description: str(s?.description, 500),
        likelihood: pick<Level>(s?.likelihood, LEVELS, "medium"),
        repairMinUsd,
        repairMaxUsd,
      };
    })
    .filter((s: Scenario) => s.name);

  let [repairMinUsd, repairMaxUsd] = range(r.repairMinUsd, r.repairMaxUsd);
  if (repairMaxUsd === 0 && damagedParts.length > 0) {
    repairMinUsd = damagedParts.reduce((sum, p) => sum + p.costMinUsd, 0);
    repairMaxUsd = damagedParts.reduce((sum, p) => sum + p.costMaxUsd, 0);
  }

  const score = typeof r.conditionScore === "number" ? r.conditionScore : 50;

  return {
    summary: str(r.summary, 1500),
    verdict: pick(r.verdict, VERDICTS, "caution"),
    conditionScore: Math.min(100, Math.max(0, Math.round(score))),
    impactZone: str(r.impactZone, 200),
    structuralRisk: pick<Level>(r.structuralRisk, LEVELS, "medium"),
    structuralRiskNote: str(r.structuralRiskNote, 600),
    airbagAssessment: pick(r.airbagAssessment, AIRBAGS, "unknown"),
    airbagNote: str(r.airbagNote, 600),
    damagedParts,
    scenarios,
    repairMinUsd,
    repairMaxUsd,
    redFlags: list(r.redFlags),
    positives: list(r.positives),
    missingViews: list(r.missingViews),
    inspectionChecklist: list(r.inspectionChecklist),
    photoNotes: (Array.isArray(r.photoNotes) ? r.photoNotes : [])
      .slice(0, 20)
      .map((n: Record<string, unknown>) => ({
        photo: typeof n?.photo === "number" ? Math.max(1, Math.round(n.photo)) : 1,
        observation: str(n?.observation, 400),
      }))
      .filter((n: { observation: string }) => n.observation),
    vinOnPhoto: str(r.vinOnPhoto, 40).toUpperCase().replace(/[^A-Z0-9]/g, ""),
    odometerOnPhoto: str(r.odometerOnPhoto, 60),
    listingConflicts: list(r.listingConflicts),
    historyProvided: r.historyProvided === true,
    historySummary: str(r.historySummary, 1500),
    historyFindings: list(r.historyFindings),
    historyMileage: pick(r.historyMileage, ["consistent", "inconsistent", "unknown"] as const, "unknown"),
  };
}
