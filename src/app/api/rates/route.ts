import { requireUser } from "@/lib/server/auth";
import { currentRates } from "@/lib/shared/rates";
import { route } from "@/lib/server/route";

async function handleGET() {
  const user = await requireUser();
  if (user instanceof Response) return user;
  return Response.json({ rates: await currentRates() });
}

export const GET = route(handleGET);
