import {
  type Comparables,
  type LotLookupResponse,
  mapProviderRecord,
  parseLotQuery,
  priceStats,
  salePricesFrom,
  searchLinks,
} from "@/lib/auction";
import { MAX_PHOTOS } from "@/lib/defaults";
import { PROVIDER_SOURCE as SOURCE, ProviderError, auctionConfigured, callProvider } from "@/lib/provider";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { hasCredits } from "@/lib/billing";
import { fail } from "@/lib/server";
import { isUnlocked, lotKeys, unlockLot } from "@/lib/unlocks";

export const maxDuration = 60;

const MAX_PHOTO_BYTES = 6_000_000;
const PHOTO_TIMEOUT = 10_000;

export async function GET() {
  return Response.json({ configured: auctionConfigured() });
}


function safePhotoUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return null;
    if (/^[\d.]+$/.test(host) || host.includes(":")) return null;
    return url;
  } catch {
    return null;
  }
}

async function downloadPhoto(raw: string): Promise<string | null> {
  const url = safePhotoUrl(raw);
  if (!url) return null;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(PHOTO_TIMEOUT),
      cache: "no-store",
      headers: { "user-agent": "Mozilla/5.0 (compatible; LotScope/1.0)", accept: "image/*" },
    });
    let type = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!type.startsWith("image/")) {
      const ext = /\.(jpe?g|png|webp)(\?|$)/i.exec(url.pathname + url.search)?.[1]?.toLowerCase();
      if (ext) type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    }
    if (type === "image/jpg") type = "image/jpeg";
    if (!res.ok || !["image/jpeg", "image/png", "image/webp"].includes(type)) return null;
    const declared = Number(res.headers.get("content-length") || 0);
    if (declared > MAX_PHOTO_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_PHOTO_BYTES) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

async function comparablesFor(make?: string, model?: string, year?: number): Promise<Comparables | null> {
  if (!make || !model || !year) return null;
  const baseModel = model.split(/\s+/)[0];
  const raw = await callProvider("/api/v2/get-cars", {
    make,
    model: baseModel,
    year_from: year - 1,
    year_to: year + 1,
    page: 1,
    per_page: 50,
  }).catch(() => null);
  const stats = priceStats(salePricesFrom(raw));
  if (!stats) return null;
  return { source: SOURCE, query: `${make} ${baseModel}, ${year - 1}–${year + 1}`, stats };
}

export async function POST(request: Request) {
  const user = await requireUser("search");
  if (user instanceof Response) return user;

  let body: { query?: unknown; unlock?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "Не вдалося прочитати запит.");
  }
  const input = typeof body.query === "string" ? body.query.slice(0, 500) : "";
  const query = parseLotQuery(input);
  if (query.kind === "unknown") {
    return fail(400, "Вставте посилання на лот Copart чи IAAI, номер лота або VIN з 17 символів.");
  }

  const base: LotLookupResponse = {
    configured: auctionConfigured(),
    query,
    links: searchLinks(query),
    found: false,
  };
  if (!base.configured) return Response.json(base);

  const keys = lotKeys(query.kind === "lot" ? query.value : "", query.kind === "vin" ? query.value : "");
  const unlocked = user.isAdmin || (await isUnlocked(user.companyId, keys));
  if (!unlocked) {
    if (body.unlock !== true) {
      return Response.json({ ...base, locked: true, credits: user.credits, message: "Деталі лота наживо доступні за тарифом." });
    }
    if (!(await hasCredits(user.companyId))) {
      return fail(402, "Аналізи за вашим тарифом закінчились. Поповніть їх на сторінці «Оплата».");
    }
  }

  try {
    const raw =
      query.kind === "vin"
        ? await callProvider("/api/v1/get-car-vin", { vin_number: query.value })
        : await callProvider("/api/v1/get-car-lot", { lot_number: query.value });
    const mapped = mapProviderRecord(raw);
    if (!mapped || (!mapped.lot.make && !mapped.lot.vin)) {
      return Response.json({ ...base, message: "Постачальник даних не знайшов цей лот. Скористайтесь посиланнями нижче." });
    }

    if (!unlocked) {
      const all = lotKeys(mapped.lot.lotNumber || (query.kind === "lot" ? query.value : ""), mapped.lot.vin || (query.kind === "vin" ? query.value : ""));
      const label = [mapped.lot.year, mapped.lot.make, mapped.lot.model].filter(Boolean).join(" ") || query.value;
      if (!(await unlockLot(user.companyId, user.id, all, label))) {
        return fail(402, "Аналізи за вашим тарифом закінчились. Поповніть їх на сторінці «Оплата».");
      }
      await audit(user, "unlock", label, "лот");
    }

    const [photos, comparables] = await Promise.all([
      Promise.all(mapped.photoUrls.slice(0, MAX_PHOTOS).map(downloadPhoto)),
      comparablesFor(mapped.lot.make, mapped.lot.model, mapped.lot.year),
    ]);

    const vinQuery = mapped.lot.vin ? parseLotQuery(mapped.lot.vin) : query;
    const response: LotLookupResponse = {
      ...base,
      links: [...new Map([...searchLinks(query, mapped.lot), ...searchLinks(vinQuery, mapped.lot)].map((l) => [l.href, l])).values()],
      found: true,
      lot: mapped.lot,
      photos: photos.filter((p): p is string => Boolean(p)),
      lastSale: mapped.lastSale,
      comparables,
    };
    return Response.json(response);
  } catch (error) {
    if (error instanceof ProviderError) return Response.json({ ...base, message: error.message });
    console.error(error);
    return Response.json({ ...base, message: "Не вдалося отримати дані лота. Скористайтесь посиланнями нижче." });
  }
}
