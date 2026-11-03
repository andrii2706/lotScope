import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, KEYLEN, { N: 16384, r: 8, p: 1 }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, keyB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64url");
  const key = await derive(password, Buffer.from(saltB64, "base64url"));
  return key.length === expected.length && timingSafeEqual(key, expected);
}

export function passwordProblem(password: string): string {
  if (password.length < 10) return "Пароль має містити щонайменше 10 символів.";
  if (password.length > 200) return "Пароль задовгий.";
  return "";
}
