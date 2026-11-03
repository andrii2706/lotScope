import { mapProviderRecord, parseLotQuery, priceStats, salePricesFrom, searchLinks } from "@/lib/shared/auction";
import { SEARCHABLE, regionOf } from "@/lib/shared/auctions";
import { MAX_PHOTOS } from "@/lib/shared/defaults";
import { PROVIDER_SOURCE as SOURCE, ProviderError, auctionConfigured, callProvider } from "@/lib/server/provider";
import { audit } from "@/lib/server/audit";
import { requireUser } from "@/lib/server/auth";
import { fail } from "@/lib/server/http";
import { route } from "@/lib/server/route";
import type { AuctionName, Comparables, LotLookupResponse } from "@/types/auction";

export const maxDuration = 60;

const MAX_PHOTO_BYTES = 6_000_000;
const PHOTO_TIMEOUT = 10_000;

async function handleGET() {
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

async function comparablesFor(make?: string, model?: string, year?: number, auction?: AuctionName): Promise<Comparables | null> {
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
  const region = regionOf(auction);
  const stats = priceStats(salePricesFrom(raw, SEARCHABLE.filter((a) => regionOf(a) === region)));
  if (!stats) return null;
  return { source: SOURCE, query: `${make} ${baseModel}, ${year - 1}–${year + 1}`, stats };
}

async function handlePOST(request: Request) {
  const user = await requireUser("search");
  if (user instanceof Response) return user;

  let body: { query?: unknown };
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

  try {
    const raw =
      query.kind === "vin"
        ? await callProvider("/api/v1/get-car-vin", { vin_number: query.value })
        : await callProvider("/api/v1/get-car-lot", { lot_number: query.value });
    const mapped = mapProviderRecord(raw);
    if (!mapped || (!mapped.lot.make && !mapped.lot.vin)) {
      return Response.json({ ...base, message: "Цей лот не знайдено. Скористайтесь посиланнями нижче." });
    }

    const label = [mapped.lot.year, mapped.lot.make, mapped.lot.model].filter(Boolean).join(" ") || query.value;
    await audit(user, "unlock", label, "лот");

    const [photos, comparables] = await Promise.all([
      Promise.all(mapped.photoUrls.slice(0, MAX_PHOTOS).map(downloadPhoto)),
      comparablesFor(mapped.lot.make, mapped.lot.model, mapped.lot.year, mapped.lot.auction ?? query.auction),
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

export const GET = route(handleGET);
export const POST = route(handlePOST);
