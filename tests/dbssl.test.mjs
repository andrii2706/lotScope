import { test } from "node:test";
import assert from "node:assert/strict";
import { poolConfig } from "../src/lib/server/dbssl.ts";

test("локальна база без SSL, хмарна з SSL", () => {
  delete process.env.DATABASE_SSL;
  delete process.env.DATABASE_SSL_CA;
  assert.equal(poolConfig("postgres://u:p@localhost:5432/db").ssl, undefined);
  assert.deepEqual(poolConfig("postgres://u:p@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require").ssl, { rejectUnauthorized: false });
});

test("сертифікат CA вмикає повну перевірку", () => {
  process.env.DATABASE_SSL_CA = "-----BEGIN CERTIFICATE-----\\nAAA\\n-----END CERTIFICATE-----";
  const cfg = poolConfig("postgres://u:p@aws-0-eu-central-1.pooler.supabase.com:6543/postgres");
  assert.equal(cfg.ssl.rejectUnauthorized, true);
  assert.equal(cfg.ssl.ca, "-----BEGIN CERTIFICATE-----\nAAA\n-----END CERTIFICATE-----");
  assert.equal(cfg.connectionString.includes("sslmode"), false);
  delete process.env.DATABASE_SSL_CA;
});
