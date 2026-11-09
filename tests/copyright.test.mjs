import { test } from "node:test";
import assert from "node:assert/strict";
import { copyrightText } from "../src/lib/shared/copyright.ts";

test("копірайт: рік запуску і діапазон у наступні роки", () => {
  assert.equal(copyrightText("ТОВ «ПАВ ІТ»", 2026, 2026), "© ТОВ «ПАВ ІТ», 2026");
  assert.equal(copyrightText("ТОВ «ПАВ ІТ»", 2026, 2028), "© ТОВ «ПАВ ІТ», 2026–2028");
});
