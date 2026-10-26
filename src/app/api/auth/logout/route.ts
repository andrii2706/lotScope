import { audit } from "@/lib/audit";
import { currentUser, destroySession } from "@/lib/auth";

export async function POST() {
  const user = await currentUser().catch(() => null);
  await destroySession();
  if (user) await audit(user, "logout");
  return Response.json({ ok: true });
}
