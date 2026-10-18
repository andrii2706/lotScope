import assert from "node:assert/strict";
import { test } from "node:test";
import { compareVins, vinCheckDigitValid, vinFlags } from "../src/lib/vin.ts";

const VALID = "1M8GDM9AXKP042788";

test("контрольна цифра: коректний і зіпсований VIN", () => {
  assert.equal(vinCheckDigitValid(VALID), true);
  assert.equal(vinCheckDigitValid("1M8GDM9A1KP042788"), false);
  assert.equal(vinCheckDigitValid("123"), null);
});

test("порівняння VIN показує точну позицію", () => {
  const diffs = compareVins("WBA8Z9650JG827636", "WBA8Z9C50JG827636");
  assert.deepEqual(diffs, [{ position: 7, listing: "6", photo: "C" }]);
  assert.equal(compareVins("WBA8Z9C50JG827636", "wba8z9c50jg827636").length, 0);
  assert.equal(compareVins("WBA8Z9C50JG827636", ""), null);
});

test("ризики щодо VIN", () => {
  const flags = vinFlags("WBA8Z9650JG827636", "WBA8Z9C50JG827636");
  assert.ok(flags.some((f) => f.includes("7-й символ")));
  assert.equal(vinFlags("", "").length, 0);
  assert.ok(vinFlags("WBA8Z9", "")[0].includes("6 символів"));
});
