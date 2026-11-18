import { test } from "node:test";
import assert from "node:assert/strict";
import { inviteEmail } from "../src/lib/server/mail.ts";

test("лист-запрошення: посилання, роль, строк і екранування", () => {
  const m = inviteEmail({ companyName: "Авто <Імпорт>", roleLabel: "Менеджер", inviter: "Андрій", link: "https://app.example/invite/abc", days: 7 });
  assert.equal(m.subject, "Запрошення до LotScope: «Авто <Імпорт>»");
  assert.ok(m.text.includes("https://app.example/invite/abc"));
  assert.ok(m.text.includes("Андрій запрошує вас"));
  assert.ok(m.text.includes("діє 7 днів"));
  assert.ok(m.html.includes("Авто &lt;Імпорт&gt;"));
  assert.ok(!m.html.includes("<Імпорт>"));
  assert.ok(m.html.includes('href="https://app.example/invite/abc"'));
});
