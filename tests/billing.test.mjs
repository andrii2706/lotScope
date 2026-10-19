import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { addMonth, nextPeriodEnd } from "../src/lib/plans.ts";
import { apiRequestBody, checkoutFields, decodeData, encodeData, formatUtc, parseCallback, paymentReference, sign, verifySignature } from "../src/lib/liqpay.ts";
import { hashPassword, verifyPassword } from "../src/lib/password.ts";

test("підпис LiqPay: base64 від sha1(ключ + data + ключ)", () => {
  const data = encodeData({ a: 1 });
  assert.equal(sign(data, "k"), createHash("sha1").update(`k${data}k`).digest("base64"));
  assert.equal(sign(data, "k", "sha3-256"), createHash("sha3-256").update(`k${data}k`).digest("base64"));
});

test("перевірка підпису приймає sha1 і sha3-256, відхиляє підробку", () => {
  const data = encodeData({ order_id: "LS-1", status: "success" });
  assert.equal(verifySignature(data, sign(data, "k"), "k"), true);
  assert.equal(verifySignature(data, sign(data, "k", "sha3-256"), "k"), true);
  assert.equal(verifySignature(data, sign(data, "other"), "k"), false);
  assert.equal(verifySignature(encodeData({ order_id: "LS-1", status: "failure" }), sign(data, "k"), "k"), false);
  assert.equal(verifySignature(data, "", "k"), false);
});

test("поля оплати: разовий платіж і підписка", () => {
  const base = { publicKey: "pub", privateKey: "k", orderId: "LS-1", amount: 1990, currency: "UAH", description: "Старт", resultUrl: "https://x/api/billing/return", serverUrl: "https://x/api/billing/webhook", now: new Date("2026-10-15T08:30:05Z") };
  const once = checkoutFields({ ...base, recurring: false });
  const onceParams = decodeData(once.data);
  assert.equal(onceParams.action, "pay");
  assert.equal(onceParams.subscribe, undefined);
  assert.equal(once.signature, sign(once.data, "k"));

  const sub = checkoutFields({ ...base, recurring: true, sandbox: true });
  const params = decodeData(sub.data);
  assert.equal(params.action, "subscribe");
  assert.equal(params.subscribe, "1");
  assert.equal(params.subscribe_periodicity, "month");
  assert.equal(params.subscribe_date_start, "2026-10-15 08:30:05");
  assert.equal(params.sandbox, 1);
  assert.equal(params.public_key, "pub");
  assert.equal(params.amount, 1990);
});

test("тіло запиту до API підписане", () => {
  const body = apiRequestBody({ action: "unsubscribe", order_id: "LS-1" }, "pub", "k");
  const params = decodeData(body.get("data"));
  assert.equal(params.action, "unsubscribe");
  assert.equal(params.public_key, "pub");
  assert.equal(body.get("signature"), sign(body.get("data"), "k"));
});

test("розбір callback і ключ регулярного списання", () => {
  const first = parseCallback({ action: "subscribe", status: "subscribed", order_id: "LS-1", payment_id: 111, amount: 1990, currency: "UAH", public_key: "pub" });
  assert.deepEqual(paymentReference(first), { reference: "LS-1", base: "LS-1" });
  const next = parseCallback({ action: "regular", status: "success", order_id: "LS-1", payment_id: 222, amount: 1990, currency: "UAH", public_key: "pub" });
  assert.deepEqual(paymentReference(next), { reference: "LS-1:222", base: "LS-1" });
  assert.equal(next.amount, 1990);
});

test("дата у форматі LiqPay", () => {
  assert.equal(formatUtc(new Date("2026-01-02T03:04:05Z")), "2026-01-02 03:04:05");
});

test("місяць підписки", () => {
  assert.equal(addMonth(new Date("2026-01-31T10:00:00Z")).toISOString().slice(0, 10), "2026-02-28");
  const now = new Date("2026-10-14T00:00:00Z");
  assert.equal(nextPeriodEnd(new Date("2026-10-20T00:00:00Z"), now).toISOString().slice(0, 10), "2026-11-20");
  assert.equal(nextPeriodEnd(null, now).toISOString().slice(0, 10), "2026-11-14");
});

test("пароль", async () => {
  const h = await hashPassword("правильний-пароль");
  assert.equal(await verifyPassword("правильний-пароль", h), true);
  assert.equal(await verifyPassword("інший-пароль", h), false);
});
