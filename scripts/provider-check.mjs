import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
nextEnv.loadEnvConfig(root);
const key = (process.env.AUCTION_API_KEY || "").trim().replace(/^bearer\s+/i, "").replace(/^["']|["']$/g, "");
const base = (process.env.AUCTION_API_URL || "https://apiauctions.io").replace(/\/+$/, "");
if (!key) {
  console.error("AUCTION_API_KEY не знайдено. Він має бути у файлі .env.local у корені проєкту, а не в .env.example.");
  process.exit(1);
}
console.log(`Ключ знайдено (${key.length} символів, починається з ${key.slice(0, 4)}…). Сервіс: ${base}\n`);

const checks = [
  ["/api/v2/get-cars", { make: "BMW", page: 1, per_page: 2 }],
  ["/api/v2/get-active-lots", { page: 1, per_page: 2 }],
];
const only = process.argv[2];
if (only) checks.push(only.length === 17 ? ["/api/v1/get-car-vin", { vin_number: only }] : ["/api/v1/get-car-lot", { lot_number: only }]);

for (const [route, params] of checks) {
  const url = new URL(base + route);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  try {
    const res = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${key}`, accept: "application/json" }, signal: AbortSignal.timeout(20000) });
    const body = await res.text();
    console.log(`POST ${route} ${JSON.stringify(params)}`);
    console.log(`  статус: ${res.status}, тип: ${res.headers.get("content-type")}`);
    console.log(`  відповідь: ${body.slice(0, 1200).replace(/\s+/g, " ")}\n`);
  } catch (e) {
    console.log(`POST ${route}: помилка запиту — ${e instanceof Error ? e.message : e}\n`);
  }
}
