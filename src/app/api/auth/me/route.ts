import { currentUser } from "@/lib/server/auth";
import { dbConfigured } from "@/lib/server/db";
import { describeDbError } from "@/lib/server/dberror";
import { UNAVAILABLE_MESSAGE } from "@/lib/shared/errors";
import { applySchemaOnce } from "@/lib/server/schema";

export async function GET() {
  if (!dbConfigured()) {
    console.error("[db] DATABASE_URL не задано: додайте його в .env.local або в змінні середовища.");
    return Response.json({ user: null, dbConfigured: true, dbError: UNAVAILABLE_MESSAGE });
  }
  try {
    return Response.json({ user: await currentUser(), dbConfigured: true });
  } catch (e) {
    const db = describeDbError(e);
    console.error(`[db] /api/auth/me: ${db?.kind ?? "error"} ${db?.code ?? ""}`, e instanceof Error ? e.message : e);
    if (db?.kind === "schema" && (await applySchemaOnce())) {
      try {
        return Response.json({ user: await currentUser(), dbConfigured: true });
      } catch (again) {
        console.error("[db] /api/auth/me after schema update", again);
      }
    }
    return Response.json({ user: null, dbConfigured: true, dbError: UNAVAILABLE_MESSAGE });
  }
}
