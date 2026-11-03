import { describeDbError } from "./dberror.ts";
import { GENERIC_MESSAGE } from "../shared/errors.ts";
import { applySchemaOnce } from "./schema.ts";

function label(args: unknown[]): string {
  const req = args[0];
  if (req instanceof Request) {
    const url = new URL(req.url);
    return `${req.method} ${url.pathname}`;
  }
  return "route";
}

export async function errorResponse(error: unknown, where = "route"): Promise<Response> {
  const db = describeDbError(error);
  if (db) {
    console.error(`[db] ${where}: ${db.kind} ${db.code}`, error instanceof Error ? error.message : error);
    if (db.kind === "schema") await applySchemaOnce();
    return Response.json({ error: db.message, code: db.kind === "connect" || db.kind === "schema" ? "unavailable" : db.kind }, { status: db.status });
  }
  console.error(`[api] ${where}`, error);
  return Response.json({ error: GENERIC_MESSAGE }, { status: 500 });
}

export function route<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      const db = describeDbError(error);
      const req = args[0];
      if (db?.kind === "schema" && req instanceof Request && req.method === "GET" && (await applySchemaOnce())) {
        try {
          return await handler(...args);
        } catch (again) {
          return errorResponse(again, label(args));
        }
      }
      return errorResponse(error, label(args));
    }
  };
}
