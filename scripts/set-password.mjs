import path from "node:path";
import readline from "node:readline/promises";
import { randomBytes, scrypt } from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "pg";
import nextEnv from "@next/env";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
nextEnv.loadEnvConfig(root);

const [emailArg, passwordArg] = process.argv.slice(2);
const email = (emailArg || "").trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Вкажіть email: npm run user:password -- you@example.com");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL не задано. Додайте його в .env.local або передайте змінною перед командою.");
  process.exit(1);
}

let password = passwordArg || "";
if (!password) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question("Новий пароль (щонайменше 10 символів): ");
  rl.close();
}
if (password.length < 10) {
  console.error("Пароль має містити щонайменше 10 символів.");
  process.exit(1);
}
if (password.length > 200) {
  console.error("Пароль задовгий.");
  process.exit(1);
}

const hash = await new Promise((resolve, reject) => {
  const salt = randomBytes(16);
  scrypt(password.normalize("NFKC"), salt, 64, { N: 16384, r: 8, p: 1 }, (err, key) =>
    err ? reject(err) : resolve(`scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`),
  );
});

const url = process.env.DATABASE_URL;
const host = new URL(url).hostname;
const mode = (process.env.DATABASE_SSL || "").toLowerCase();
const off = mode === "off" || mode === "false" || (!mode && ["localhost", "127.0.0.1", "::1", "db", "postgres"].includes(host));
const sslCa = (process.env.DATABASE_SSL_CA || "").replace(/\\n/g, "\n").trim();
const clean = url.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");
const client = new pg.Client(off ? { connectionString: clean } : { connectionString: clean, ssl: sslCa ? { ca: sslCa, rejectUnauthorized: true } : mode === "verify" ? true : { rejectUnauthorized: false } });
await client.connect();
try {
  const res = await client.query("update users set password_hash = $2 where lower(email) = $1 returning id, name", [email, hash]);
  const admins = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!res.rowCount && admins.includes(email)) {
    const id = () => randomBytes(8).toString("hex");
    const companyId = id();
    await client.query("insert into companies (id, name, kind, seats) values ($1, 'LotScope', 'personal', 1)", [companyId]);
    await client.query("insert into users (id, email, name, password_hash, company_id, role) values ($1, $2, $3, $4, $5, 'user')", [id(), email, email.split("@")[0], hash, companyId]);
    console.log(`Створено акаунт супер адміна ${email}. Тепер можна увійти з цим паролем.`);
  } else if (!res.rowCount) {
    console.error(`Користувача ${email} не знайдено в цій базі. Нового користувача скрипт створює лише для пошти з ADMIN_EMAILS.`);
    process.exitCode = 1;
  } else {
    const { id, name } = res.rows[0];
    const sessions = await client.query("delete from sessions where user_id = $1", [id]);
    console.log(`Пароль для ${name || email} змінено. Завершено активних сесій: ${sessions.rowCount}.`);
  }
} finally {
  await client.end();
}
