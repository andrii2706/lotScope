import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import nextEnv from "@next/env";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
nextEnv.loadEnvConfig(root);
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL не задано. Додайте його в .env.local.");
  process.exit(1);
}
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query(fs.readFileSync(path.join(root, "db", "schema.sql"), "utf8"));
await client.end();
console.log("Схему бази даних оновлено.");
