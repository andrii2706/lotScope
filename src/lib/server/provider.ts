const BASE = (process.env.AUCTION_API_URL || "https://apiauctions.io").replace(/\/+$/, "");
const API_TIMEOUT = 20_000;

export const PROVIDER_SOURCE = "apiauctions.io";

export class ProviderError extends Error {
  constructor(message: string, public detail = "") {
    super(message);
  }
}

const apiKey = () => (process.env.AUCTION_API_KEY || "").trim().replace(/^bearer\s+/i, "").replace(/^["']|["']$/g, "");

export const auctionConfigured = () => Boolean(apiKey());

export async function callProvider(
  path: string,
  params: Record<string, string | number | string[]>,
): Promise<unknown> {
  const url = new URL(`${BASE}${path}`);
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((item) => form.append(`${k}[]`, item));
    else form.set(k, String(v));
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey()}`, accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body: form,
    signal: AbortSignal.timeout(API_TIMEOUT),
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) {
    const body = await res.text().catch(() => "");
    console.error(`[provider] ${path} -> ${res.status} ${body.slice(0, 300)} (перевірте AUCTION_API_KEY)`);
    throw new ProviderError("Дані аукціонів зараз недоступні. Спробуйте пізніше.", `${path} -> ${res.status}, ключ AUCTION_API_KEY не прийнято`);
  }
  if (res.status === 404) {
    console.error(`[provider] ${path} -> 404`);
    return null;
  }
  if (res.status === 429) {
    console.error(`[provider] ${path} -> 429, ліміт запитів вичерпано`);
    throw new ProviderError("Забагато запитів до даних аукціонів. Спробуйте за годину.", `${path} -> 429`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[provider] ${path} -> ${res.status} ${body.slice(0, 300)}`);
    throw new ProviderError("Дані аукціонів зараз недоступні. Спробуйте пізніше.", `${path} -> ${res.status}`);
  }
  const json = await res.json().catch(() => null);
  if (json === null) console.error(`Provider ${path} -> ${res.status}, відповідь не є JSON`);
  return json;
}
