import { audit } from "@/lib/server/audit";
import { currentUser, destroySession } from "@/lib/server/auth";
import { route } from "@/lib/server/route";

async function handlePOST() {
  const user = await currentUser().catch(() => null);
  await destroySession();
  if (user) await audit(user, "logout");
  return Response.json({ ok: true });
}

export const POST = route(handlePOST);
