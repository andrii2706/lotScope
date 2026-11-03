import { requireUser } from "./auth.ts";

export async function requireSuperadmin() {
  const user = await requireUser("console");
  if (user instanceof Response) return user;
  return user;
}
