import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import nextEnv from "@next/env";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
nextEnv.loadEnvConfig(root);
const optional = process.argv.includes("--optional");
if (!process.env.DATABASE_URL && optional) {
  console.log("DATABASE_URL не задано: міграцію пропущено.");
  process.exit(0);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL не задано. Додайте його в .env.local.");
  process.exit(1);
}
const url = process.env.DATABASE_URL;
const host = new URL(url).hostname;
const mode = (process.env.DATABASE_SSL || "").toLowerCase();
const off = mode === "off" || mode === "false" || (!mode && ["localhost", "127.0.0.1", "::1", "db", "postgres"].includes(host));
const clean = url.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");
const client = new pg.Client(off ? { connectionString: clean } : { connectionString: clean, ssl: mode === "verify" ? true : { rejectUnauthorized: false } });
await client.connect();
await client.query(fs.readFileSync(path.join(root, "db", "schema.sql"), "utf8"));
await client.end();
console.log("Схему бази даних оновлено.");
