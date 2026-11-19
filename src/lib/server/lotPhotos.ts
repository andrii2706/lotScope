import { createHmac, timingSafeEqual } from "node:crypto";

export const MAX_PHOTO_BYTES = 4_000_000;
const PHOTO_TIMEOUT = 10_000;

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

export function photoSignature(url: string, secret: string): string {
  return createHmac("sha256", secret).update(url).digest("base64url");
}

export function checkPhotoSignature(url: string, signature: string, secret: string): boolean {
  if (!secret || !signature) return false;
  const expected = Buffer.from(photoSignature(url, secret));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function photoProxyPath(url: string, secret: string): string {
  return `/api/lot/photo?u=${encodeURIComponent(url)}&s=${photoSignature(url, secret)}`;
}

export async function downloadPhoto(url: URL): Promise<{ type: string; bytes: Buffer } | null> {
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
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_PHOTO_BYTES) return null;
    return { type, bytes };
  } catch {
    return null;
  }
}
