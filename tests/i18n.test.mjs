import test from "node:test";
import assert from "node:assert/strict";
import { collectKeys } from "../scripts/i18n-keys.mjs";
import { PL } from "../src/lib/shared/i18n/pl.ts";
import { L, fmtInt, setLang, t } from "../src/lib/shared/i18n.ts";

test("every Ukrainian text shown to people has a Polish translation", () => {
  const missing = [...collectKeys()].filter(([k]) => !(k in PL)).map(([k, f]) => `${f}: ${k}`);
  assert.deepEqual(missing, []);
});

test("translations keep placeholders and edge spaces", () => {
  for (const [uk, pl] of Object.entries(PL)) {
    const ph = (s) => (s.match(/\{v\d+\}/g) ?? []).sort().join(",");
    assert.equal(ph(pl), ph(uk), uk);
    assert.equal(pl.startsWith(" "), uk.startsWith(" "), uk);
    assert.equal(pl.endsWith(" "), uk.endsWith(" "), uk);
    assert.ok(!/[а-яіїєґ]/i.test(pl), `Cyrillic left in: ${pl}`);
  }
});

test("t, L and number format follow the language", () => {
  const labels = L({ a: "Звіти", nested: { b: "Команда" } });
  setLang("uk");
  assert.equal(t("Звіти"), "Звіти");
  assert.equal(labels.a, "Звіти");
  setLang("pl");
  assert.equal(t("Звіти"), "Raporty");
  assert.equal(labels.a, "Raporty");
  assert.equal(labels.nested.b, "Zespół");
  assert.equal(t("Фото {v0}", { v0: 3 }), "Zdjęcie 3");
  assert.equal(t("Не більше 20 фото за один аналіз."), "Maksymalnie 20 zdjęć w jednej analizie.");
  assert.equal(t("Текст без перекладу"), "Текст без перекладу");
  assert.equal(fmtInt(12345).replace(/\s/g, " "), "12 345");
  setLang("uk");
});
