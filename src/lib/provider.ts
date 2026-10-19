const BASE = (process.env.AUCTION_API_URL || "https://apiauctions.io").replace(/\/+$/, "");
const API_TIMEOUT = 20_000;

export const PROVIDER_SOURCE = "apiauctions.io";

export class ProviderError extends Error {}

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
    console.error(`Provider ${path} -> ${res.status} ${body.slice(0, 300)}`);
    throw new ProviderError(`Постачальник даних не прийняв ключ AUCTION_API_KEY (код ${res.status}). Перевірте токен у кабінеті apiauctions.io.`);
  }
  if (res.status === 404) {
    console.error(`Provider ${path} -> 404`);
    return null;
  }
  if (res.status === 429) throw new ProviderError("Ліміт запитів до постачальника даних вичерпано. Демо-тариф дозволяє лише 10 запитів на годину.");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`Provider ${path} -> ${res.status} ${body.slice(0, 300)}`);
    throw new ProviderError(`Постачальник даних відхилив запит (код ${res.status}). Подробиці в консолі сервера.`);
  }
  const json = await res.json().catch(() => null);
  if (json === null) console.error(`Provider ${path} -> ${res.status}, відповідь не є JSON`);
  return json;
}
