import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../src/lib/server/password.ts";

test("пароль", async () => {
  const h = await hashPassword("правильний-пароль");
  assert.equal(await verifyPassword("правильний-пароль", h), true);
  assert.equal(await verifyPassword("інший-пароль", h), false);
});

test("лист скидання пароля: посилання, екранування, текстова версія", async () => {
  const { resetEmail } = await import("../src/lib/server/mail.ts");
  const m = resetEmail("<Андрій>", "https://app.example.com/reset-password?token=abc&x=1", 60);
  assert.equal(m.subject, "Скидання пароля LotScope");
  assert.ok(m.html.includes("&lt;Андрій&gt;"));
  assert.ok(!m.html.includes("<Андрій>"));
  assert.ok(m.html.includes("token=abc&amp;x=1"));
  assert.ok(m.text.includes("https://app.example.com/reset-password?token=abc&x=1"));
  assert.ok(m.text.includes("60 хвилин"));
});
