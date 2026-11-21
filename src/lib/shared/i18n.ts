import { PL, PL_PATTERNS } from "./i18n/pl.ts";

export type Lang = "uk" | "pl";
export type Market = "ua" | "pl";

let lang: Lang = "uk";
const listeners = new Set<() => void>();

export const langOf = (market: unknown): Lang => (market === "pl" ? "pl" : "uk");

export function getLang(): Lang {
  return lang;
}

export function setLang(next: Lang): void {
  if (next === lang) return;
  lang = next;
  listeners.forEach((l) => l());
}

export function subscribeLang(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const fill = (s: string, vars?: Record<string, string | number>) =>
  vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;

function pattern(uk: string): string | undefined {
  for (const [re, out] of PL_PATTERNS) if (re.test(uk)) return uk.replace(re, out);
  return undefined;
}

export function t(uk: string, vars?: Record<string, string | number>, to: Lang = lang): string {
  return fill(to === "pl" ? (PL[uk] ?? pattern(uk) ?? uk) : uk, vars);
}

export const tk = (uk: string): string => uk;

const PL_VALUES = new Set(Object.values(PL));

export function isUserText(s: string): boolean {
  return /[а-яіїєґ]/i.test(s) || PL_VALUES.has(s);
}

export const localeOf = (to: Lang = lang): string => (to === "pl" ? "pl-PL" : "uk-UA");

export function fmtNum(n: number, opts?: Intl.NumberFormatOptions, to: Lang = lang): string {
  return n.toLocaleString(localeOf(to), opts);
}

export function fmtInt(n: number, to: Lang = lang): string {
  return Math.round(n).toLocaleString(localeOf(to));
}

export function fmtDate(value: string | number | Date, opts?: Intl.DateTimeFormatOptions, to: Lang = lang): string {
  return new Date(value).toLocaleDateString(localeOf(to), opts);
}

export function fmtDateTime(value: string | number | Date, opts?: Intl.DateTimeFormatOptions, to: Lang = lang): string {
  return new Date(value).toLocaleString(localeOf(to), opts);
}

export function fmtTime(value: string | number | Date, opts?: Intl.DateTimeFormatOptions, to: Lang = lang): string {
  return new Date(value).toLocaleTimeString(localeOf(to), opts);
}

const isPlain = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null) && !("$$typeof" in v);

export function L<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => L(v)) as T;
  if (!isPlain(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (typeof v === "string") Object.defineProperty(out, key, { get: () => t(v), enumerable: true, configurable: true });
    else out[key] = L(v);
  }
  return out as T;
}

export function withLang<T>(to: Lang, fn: () => T): T {
  const prev = lang;
  lang = to;
  try {
    return fn();
  } finally {
    lang = prev;
  }
}
