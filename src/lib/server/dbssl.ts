import type pg from "pg";

export function poolConfig(url: string | undefined): pg.PoolConfig {
  if (!url) return {};
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return { connectionString: url };
  }
  const local = ["localhost", "127.0.0.1", "::1", "db", "postgres"].includes(host);
  const mode = (process.env.DATABASE_SSL || "").toLowerCase();
  const off = mode === "off" || mode === "false" || (!mode && local);
  const clean = url.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");
  if (off) return { connectionString: clean };
  const ca = (process.env.DATABASE_SSL_CA || "").replace(/\\n/g, "\n").trim();
  if (ca) return { connectionString: clean, ssl: { ca, rejectUnauthorized: true } };
  return { connectionString: clean, ssl: mode === "verify" ? true : { rejectUnauthorized: false } };
}
