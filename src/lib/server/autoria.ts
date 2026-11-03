import { matchMake, matchModel, statsFrom } from "../shared/autoriaMatch.ts";
import { query } from "./db.ts";
import type { MarketResponse, MarketStats } from "@/types/pricing";

const BASE = (process.env.AUTORIA_API_URL || "https://developers.ria.com").replace(/\/$/, "");
const KEY = () => (process.env.AUTORIA_API_KEY || "").trim();
const CACHE_DAYS = 7;
const DICT_DAYS = 30;
const MIN_SAMPLE = 5;

type Rec = Record<string, unknown>;
type DictItem = { name: string; value: number };
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);

export class RiaError extends Error {}
class NotEnoughData extends Error {}

export const autoriaConfigured = () => Boolean(KEY());

const UNAVAILABLE = "Ринкова ціна зараз недоступна. Вкажіть ціну вручну.";

async function ria(path: string, params: Record<string, string | number> = {}): Promise<unknown> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  url.searchParams.set("api_key", KEY());
  const safe = `${path}?${[...url.searchParams].filter(([k]) => k !== "api_key").map(([k, v]) => `${k}=${v}`).join("&")}`;
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(12_000), cache: "no-store", headers: { accept: "application/json" } });
  } catch (e) {
    console.error(`[autoria] ${safe} мережа: ${e instanceof Error ? e.message : e}`);
    throw new RiaError(UNAVAILABLE);
  }
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  const message = isRec(body) ? String((isRec(body.error) ? body.error.message ?? body.error.code : body.message) ?? "") : "";
  const code = isRec(body) && isRec(body.error) ? String(body.error.code ?? "") : "";
  if (res.status === 400 && /not enough data/i.test(message)) throw new NotEnoughData();
  if (res.status === 429 || code === "OVER_RATE_LIMIT") {
    console.error(`[autoria] ${safe} -> ${res.status} ${code}: ліміт запитів вичерпано (безкоштовний ключ: ~30 на годину, 1000 на місяць)`);
    throw new RiaError("Ринкову ціну зараз не вдалося отримати. Спробуйте пізніше або вкажіть ціну вручну.");
  }
  if (!res.ok) {
    console.error(`[autoria] ${safe} -> ${res.status} ${code} ${message || text.slice(0, 200)}${res.status === 401 || res.status === 403 || code.startsWith("API_KEY") ? " (перевірте AUTORIA_API_KEY)" : ""}`);
    throw new RiaError(UNAVAILABLE);
  }
  if (body === null) {
    console.error(`[autoria] ${safe} -> ${res.status}, відповідь не JSON: ${text.slice(0, 200)}`);
    throw new RiaError(UNAVAILABLE);
  }
  const notices = isRec(body) && Array.isArray(body.noticeData) ? body.noticeData.filter((n) => isRec(n) && n.noticeType === "error") : [];
  if (notices.length) {
    console.error(`[autoria] ${safe} -> помилка у відповіді: ${notices.map((n) => String((n as Rec).noticeString ?? (n as Rec).message ?? "")).join("; ")}`);
    throw new RiaError(UNAVAILABLE);
  }
  return body;
}

async function cached<T>(key: string, days: number): Promise<T | null> {
  try {
    const rows = await query<{ data: T }>(`select data from market_cache where key = $1 and created_at > now() - make_interval(days => $2)`, [key, days]);
    return rows[0]?.data ?? null;
  } catch {
    return null;
  }
}

async function remember(key: string, data: unknown) {
  try {
    await query(
      `insert into market_cache (key, data, created_at) values ($1, $2::jsonb, now())
       on conflict (key) do update set data = excluded.data, created_at = now()`,
      [key, JSON.stringify(data)],
    );
  } catch {}
}

const dictMemory = new Map<string, DictItem[]>();

async function dictionary(path: string): Promise<DictItem[]> {
  const memo = dictMemory.get(path);
  if (memo) return memo;
  const key = `ria:dict:${path}`;
  const stored = await cached<DictItem[]>(key, DICT_DAYS);
  if (stored?.length) {
    dictMemory.set(path, stored);
    return stored;
  }
  const raw = await ria(path);
  const items = (Array.isArray(raw) ? raw : [])
    .filter(isRec)
    .map((r) => ({ name: String(r.name ?? ""), value: Number(r.value) }))
    .filter((r) => r.name && Number.isFinite(r.value));
  if (items.length) {
    dictMemory.set(path, items);
    await remember(key, items);
  } else {
    console.error(`[autoria] ${path}: порожній довідник`);
  }
  return items;
}

interface YearSample {
  total: number;
  prices: number[];
}

async function averageForYear(markId: number, modelId: number, year: number): Promise<YearSample | null> {
  try {
    const raw = await ria("/auto/average_price", { marka_id: markId, model_id: modelId, yers: year });
    if (!isRec(raw)) return null;
    const prices = (Array.isArray(raw.prices) ? raw.prices : []).map(Number).filter((p) => Number.isFinite(p) && p >= 500);
    const total = Number(raw.total);
    return { total: Number.isFinite(total) ? total : prices.length, prices };
  } catch (e) {
    if (e instanceof NotEnoughData) return null;
    throw e;
  }
}

export async function marketPrice(make: string, model: string, year: number): Promise<MarketResponse> {
  if (!autoriaConfigured()) {
    console.error("[autoria] AUTORIA_API_KEY не задано: ринкова ціна вимкнена");
    return { configured: false, found: false };
  }
  const marks = await dictionary("/auto/categories/1/marks");
  const mark = matchMake(marks, make);
  if (!mark) {
    console.error(`[autoria] марку «${make}» не знайдено серед ${marks.length} марок`);
    return { configured: true, found: false, message: `Марку «${make}» не знайдено на AUTO.RIA. Вкажіть ціну вручну.` };
  }
  const models = await dictionary(`/auto/categories/1/marks/${mark.value}/models`);
  const mdl = matchModel(models, make, model);
  if (!mdl) {
    console.error(`[autoria] модель «${model}» не знайдено серед ${models.length} моделей ${mark.name}`);
    return { configured: true, found: false, message: `Модель «${model}» не знайдено на AUTO.RIA. Вкажіть ціну вручну.` };
  }

  const key = `ria:avg:${mark.value}:${mdl.value}:${year}`;
  const hit = await cached<MarketStats>(key, CACHE_DAYS);
  if (hit) return { configured: true, found: true, stats: hit };

  const samples: YearSample[] = [];
  const exact = await averageForYear(mark.value, mdl.value, year);
  if (exact) samples.push(exact);
  let years = `${year}`;
  if (!exact || exact.prices.length < MIN_SAMPLE) {
    for (const y of [year - 1, year + 1]) {
      const s = await averageForYear(mark.value, mdl.value, y);
      if (s) samples.push(s);
    }
    years = `${year - 1}–${year + 1}`;
  }
  const label = `${mark.name} ${mdl.name}, ${years}`;
  const prices = samples.flatMap((s) => s.prices);
  const stats = statsFrom(prices);
  if (!stats) return { configured: true, found: false, message: `На AUTO.RIA замало оголошень ${label}. Вкажіть ціну вручну.` };
  const data: MarketStats = {
    query: label,
    total: samples.reduce((n, s) => n + s.total, 0),
    ...stats,
    links: [],
    checkedAt: new Date().toISOString(),
  };
  await remember(key, data);
  return { configured: true, found: true, stats: data };
}
