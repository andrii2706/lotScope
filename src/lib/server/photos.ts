import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_PHOTO_BYTES = 6_000_000;
const PHOTO_TIMEOUT = 10_000;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export function safePhotoUrl(raw: string): URL | null {
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

function signature(url: string, key: string): string {
  return createHmac("sha256", key).update(url).digest("base64url");
}

export function photoProxyUrl(url: string, key: string): string {
  return `/api/lot/photo?u=${encodeURIComponent(url)}&s=${signature(url, key)}`;
}

export function verifyPhoto(url: string, sig: string, key: string): boolean {
  if (!key || !sig) return false;
  const expected = Buffer.from(signature(url, key));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function downloadPhoto(raw: string): Promise<{ type: string; bytes: Buffer } | null> {
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
    if (!res.ok || !TYPES.includes(type)) return null;
    const declared = Number(res.headers.get("content-length") || 0);
    if (declared > MAX_PHOTO_BYTES) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_PHOTO_BYTES) return null;
    return { type, bytes };
  } catch {
    return null;
  }
}
