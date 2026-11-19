import { cookies } from "next/headers";
import { SESSION_COOKIE, requireUser } from "@/lib/server/auth";
import { checkPhotoSignature, downloadPhoto, safePhotoUrl } from "@/lib/server/lotPhotos";
import { fail } from "@/lib/server/http";
import { route } from "@/lib/server/route";

async function handleGET(request: Request) {
  const user = await requireUser("search");
  if (user instanceof Response) return user;
  const params = new URL(request.url).searchParams;
  const raw = params.get("u") ?? "";
  const secret = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  const url = safePhotoUrl(raw);
  if (!url || !checkPhotoSignature(url.href, params.get("s") ?? "", secret)) return fail(404, "Фото не знайдено.");
  const photo = await downloadPhoto(url);
  if (!photo) return fail(404, "Фото не вдалося завантажити.", `[lot-photo] ${url.hostname}`);
  return new Response(new Uint8Array(photo.bytes), {
    headers: { "content-type": photo.type, "cache-control": "private, max-age=600", "x-content-type-options": "nosniff" },
  });
}

export const GET = route(handleGET);
