import { requireUser } from "@/lib/server/auth";
import { ProviderError, auctionConfigured, callProvider } from "@/lib/server/provider";
import { fail, readJson } from "@/lib/server/http";
import { mapVinDecoding } from "@/lib/shared/vinDecode";
import { route } from "@/lib/server/route";

async function handleGET() {
  return Response.json({ configured: auctionConfigured() });
}

async function handlePOST(request: Request) {
  const user = await requireUser("analyze");
  if (user instanceof Response) return user;
  if (!auctionConfigured()) return fail(503, "Розшифрування VIN зараз недоступне.", "AUCTION_API_KEY не задано");
  const body = await readJson<{ vin?: unknown }>(request);
  const vin = typeof body?.vin === "string" ? body.vin.trim().toUpperCase() : "";
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return fail(400, "VIN має містити 17 символів без літер I, O, Q.");
  try {
    const decoded = mapVinDecoding(await callProvider("/api/v2/vin-decoding", { vin }));
    if (!decoded) return fail(404, "Не вдалося розшифрувати цей VIN. Заповніть дані вручну.");
    return Response.json({ decoded });
  } catch (error) {
    if (error instanceof ProviderError) return fail(503, error.message, error.detail);
    return fail(503, "Не вдалося розшифрувати VIN. Спробуйте пізніше.", error);
  }
}

export const GET = route(handleGET);
export const POST = route(handlePOST);
