import { currentUser } from "@/lib/auth";
import { DB_DOWN_MESSAGE, dbConfigured } from "@/lib/db";

export async function GET() {
  if (!dbConfigured()) return Response.json({ user: null, dbConfigured: false });
  try {
    return Response.json({ user: await currentUser(), dbConfigured: true });
  } catch (e) {
    console.error("Database error:", e instanceof Error ? e.message : e);
    return Response.json({ user: null, dbConfigured: true, dbError: DB_DOWN_MESSAGE });
  }
}
