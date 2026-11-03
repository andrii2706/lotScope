import type { MarketStats } from "@/types/pricing";
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9а-яіїє]/g, "");

export function matchMake(items: { name: string; value: number }[], make: string) {
  const q = norm(make);
  return items.find((i) => norm(i.name) === q) ?? items.find((i) => norm(i.name).startsWith(q) || q.startsWith(norm(i.name)));
}

export function matchModel(items: { name: string; value: number }[], make: string, model: string) {
  const q = norm(model);
  if (!q) return undefined;
  const exact = items.find((i) => norm(i.name) === q);
  if (exact) return exact;
  const tokens = model.toLowerCase().split(/[\s-]+/).map(norm).filter(Boolean);
  const byName = [...items]
    .filter((i) => norm(i.name).length >= 2)
    .sort((a, b) => norm(b.name).length - norm(a.name).length)
    .find((i) => q.startsWith(norm(i.name)) || tokens.includes(norm(i.name)));
  if (byName) return byName;
  const m = make.toLowerCase();
  const bmw = /^([1-8])\d{2}[a-z]*$/.exec(tokens[0] ?? "");
  if (m.includes("bmw") && bmw) {
    const gt = /\bgt\b|gran\s*turismo/i.test(model);
    const base = `${bmw[1]}series`;
    return items.find((i) => norm(i.name) === (gt ? `${base}gt` : base)) ?? items.find((i) => norm(i.name) === base);
  }
  const merc = /^([a-z]{1,3})\d{2,3}/.exec(q);
  if (m.includes("mercedes") && merc) return items.find((i) => norm(i.name) === `${merc[1]}class`);
  return undefined;
}

function quantile(sorted: number[], p: number) {
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo));
}

export function statsFrom(prices: number[]): Pick<MarketStats, "medianUsd" | "p25Usd" | "p75Usd" | "used"> | null {
  const sorted = prices.filter((p) => p > 0).sort((a, b) => a - b);
  if (sorted.length < 2) return null;
  return { used: sorted.length, medianUsd: quantile(sorted, 0.5), p25Usd: quantile(sorted, 0.25), p75Usd: quantile(sorted, 0.75) };
}

