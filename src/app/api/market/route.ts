import { requireUser } from "@/lib/server/auth";
import { RiaError, autoriaConfigured, marketPrice } from "@/lib/server/autoria";
import { fail, readJson } from "@/lib/server/http";
import { route } from "@/lib/server/route";
import { FEATURES } from "@/config/features";

export const maxDuration = 60;

async function handleGET() {
  return Response.json({ configured: FEATURES.marketPriceAuto && autoriaConfigured() });
}

async function handlePOST(request: Request) {
  const user = await requireUser("analyze");
  if (user instanceof Response) return user;
  const body = await readJson<{ make?: unknown; model?: unknown; year?: unknown }>(request);
  const make = typeof body?.make === "string" ? body.make.trim().slice(0, 60) : "";
  const model = typeof body?.model === "string" ? body.model.trim().slice(0, 80) : "";
  const year = typeof body?.year === "number" ? Math.round(body.year) : 0;
  if (!make || !model || year < 1980) return fail(400, "Спершу вкажіть марку, модель і рік.");
  if (!FEATURES.marketPriceAuto) return Response.json({ configured: false, found: false });
  try {
    return Response.json(await marketPrice(make, model, year));
  } catch (error) {
    if (error instanceof RiaError) return Response.json({ configured: true, found: false, message: error.message });
    console.error(error);
    return Response.json({ configured: true, found: false, message: "Не вдалося отримати ринкові ціни. Вкажіть ціну вручну." });
  }
}

export const GET = route(handleGET);
export const POST = route(handlePOST);
