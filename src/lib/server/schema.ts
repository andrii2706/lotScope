import fs from "node:fs/promises";
import path from "node:path";
import { pool } from "./db.ts";

let running: Promise<boolean> | null = null;
let done = false;

export function applySchemaOnce(): Promise<boolean> {
  if (done) return Promise.resolve(false);
  running ??= (async () => {
    try {
      const sql = await fs.readFile(path.join(process.cwd(), "db", "schema.sql"), "utf8");
      await pool().query(sql);
      console.warn("[db] Схему бази даних оновлено автоматично.");
      return true;
    } catch (e) {
      console.error("[db] Автоматичне оновлення схеми не вдалося. Виконайте npm run db:migrate.", e);
      return false;
    } finally {
      done = true;
      running = null;
    }
  })();
  return running;
}
