import pg from "pg";
import { poolConfig } from "./dbssl.ts";
import { describeDbError } from "./dberror.ts";
import { UNAVAILABLE_MESSAGE } from "../shared/errors.ts";

const globalForPool = globalThis as unknown as { lotscopePool?: pg.Pool };

export const dbConfigured = () => Boolean(process.env.DATABASE_URL);

export function pool(): pg.Pool {
  if (!globalForPool.lotscopePool) {
    globalForPool.lotscopePool = new pg.Pool({
      ...poolConfig(process.env.DATABASE_URL),
      max: 5,
      connectionTimeoutMillis: 5000,
      query_timeout: 15000,
    });
    globalForPool.lotscopePool.on("error", (e) => console.error("Postgres", e.message));
  }
  return globalForPool.lotscopePool;
}

export async function query<T extends pg.QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool().query<T>(text, params);
  return res.rows;
}

export async function tx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export const DB_DOWN_MESSAGE = UNAVAILABLE_MESSAGE;

export function dbDown(error: unknown): Response {
  const db = describeDbError(error);
  console.error(`[db] ${db?.kind ?? "error"} ${db?.code ?? ""}`, error instanceof Error ? error.message : error);
  return Response.json({ error: db?.message ?? UNAVAILABLE_MESSAGE, code: "unavailable" }, { status: db?.status ?? 503 });
}

export function dbMissing(): Response {
  console.error("[db] DATABASE_URL не задано: додайте його в .env.local або в змінні середовища.");
  return Response.json({ error: UNAVAILABLE_MESSAGE, code: "unavailable" }, { status: 503 });
}
