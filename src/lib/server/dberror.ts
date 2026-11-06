import { GENERIC_MESSAGE, TIMEOUT_MESSAGE, UNAVAILABLE_MESSAGE } from "../shared/errors.ts";
import type { DbProblem } from "@/types/system";

const CONNECT = new Set(["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "EAI_AGAIN", "ECONNRESET", "EHOSTUNREACH", "28P01", "28000", "3D000", "57P01", "57P03", "53300", "08000", "08001", "08003", "08004", "08006", "SELF_SIGNED_CERT_IN_CHAIN", "DEPTH_ZERO_SELF_SIGNED_CERT"]);
const SCHEMA = new Set(["42P01", "42703", "42704", "42883"]);

export function describeDbError(error: unknown): DbProblem | null {
  if (!error || typeof error !== "object") return null;
  const code = String((error as { code?: unknown }).code ?? "");
  const message = error instanceof Error ? error.message : "";
  if (CONNECT.has(code) || /timeout exceeded when trying to connect|connection terminated|password authentication failed|does not support ssl|no pg_hba/i.test(message)) {
    return { kind: "connect", status: 503, message: UNAVAILABLE_MESSAGE, code: code || "connect" };
  }
  if (SCHEMA.has(code)) return { kind: "schema", status: 503, message: UNAVAILABLE_MESSAGE, code };
  if (code === "23505") return { kind: "conflict", status: 409, message: "Такий запис уже існує.", code };
  if (code === "23503") return { kind: "missing", status: 409, message: "Запис не знайдено або його вже видалено. Оновіть сторінку.", code };
  if (code === "22P02" || code === "22001" || code === "23502" || code === "23514") return { kind: "data", status: 400, message: "Перевірте введені дані і спробуйте ще раз.", code };
  if (code === "57014") return { kind: "timeout", status: 504, message: TIMEOUT_MESSAGE, code };
  if (/^[0-9A-Z]{5}$/.test(code)) return { kind: "other", status: 500, message: GENERIC_MESSAGE, code };
  return null;
}

export function dbTarget(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) return "DATABASE_URL не задано";
  try {
    const u = new URL(raw);
    return `${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "DATABASE_URL має неправильний формат";
  }
}

const HINTS: Record<string, string> = {
  ECONNREFUSED: "Postgres не запущений на цій адресі (локально: запустіть Docker Desktop і docker compose up -d)",
  ENOTFOUND: "хост з DATABASE_URL не знайдено, перевірте адресу",
  EAI_AGAIN: "хост з DATABASE_URL не знайдено, перевірте адресу або інтернет",
  ETIMEDOUT: "база не відповідає, перевірте адресу, порт і мережу",
  "28P01": "неправильний логін або пароль у DATABASE_URL",
  "3D000": "бази з такою назвою не існує",
};

export function dbErrorDetail(error: unknown): string {
  const parts = error instanceof AggregateError && error.errors.length ? error.errors : [error];
  const text = parts
    .map((e) => (e instanceof Error ? e.message : String(e)))
    .filter(Boolean)
    .join("; ");
  const problem = describeDbError(error);
  if (problem?.kind !== "connect") return text;
  const hint = HINTS[problem.code] ?? "";
  return `${text || problem.code} → ${dbTarget()}${hint ? ` (${hint})` : ""}`;
}
