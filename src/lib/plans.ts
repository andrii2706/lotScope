export type PlanId = "trial" | "personal" | "start" | "team" | "pack20";

export interface Plan {
  id: PlanId;
  name: string;
  priceUah: number;
  credits: number;
  recurring: boolean;
  audience: "team" | "personal" | "any";
  description: string;
}

export const TRIAL_CREDITS = 3;

export const PLANS: Record<PlanId, Plan> = {
  trial: { id: "trial", name: "Пробний", priceUah: 0, credits: TRIAL_CREDITS, recurring: false, audience: "any", description: `${TRIAL_CREDITS} аналізи, щоб спробувати` },
  personal: { id: "personal", name: "Особистий", priceUah: 490, credits: 15, recurring: true, audience: "personal", description: "15 аналізів щомісяця, збереження звітів і PDF" },
  start: { id: "start", name: "Старт", priceUah: 1990, credits: 50, recurring: true, audience: "team", description: "50 аналізів щомісяця для команди" },
  team: { id: "team", name: "Команда", priceUah: 5990, credits: 200, recurring: true, audience: "team", description: "200 аналізів щомісяця для команди" },
  pack20: { id: "pack20", name: "Пакет +20", priceUah: 990, credits: 20, recurring: false, audience: "any", description: "20 аналізів без терміну дії" },
};

export const PAID_PLANS = [PLANS.personal, PLANS.start, PLANS.team, PLANS.pack20];
export const PAID_SUBSCRIPTIONS: string[] = ["personal", "start", "team"];

export const plansFor = (kind: "team" | "personal") => PAID_PLANS.filter((p) => p.audience === "any" || p.audience === kind);

export const isPlanId = (v: unknown): v is PlanId => typeof v === "string" && v in PLANS;

export function addMonth(from: Date): Date {
  const d = new Date(from);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

export function nextPeriodEnd(current: Date | null, now: Date): Date {
  return addMonth(current && current > now ? current : now);
}
