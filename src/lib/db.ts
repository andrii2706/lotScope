import pg from "pg";
import { poolConfig } from "./dbssl";

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

export const DB_DOWN_MESSAGE =
  "Не вдалося підключитися до бази даних. Перевірте, що Postgres запущений (docker compose up -d) і DATABASE_URL у .env.local правильний.";

export function dbDown(error: unknown): Response {
  console.error("Database error:", error instanceof Error ? error.message : error);
  return Response.json({ error: DB_DOWN_MESSAGE }, { status: 503 });
}
