import { test } from "node:test";
import assert from "node:assert/strict";
import { can, homeFor, routePermission } from "../src/lib/shared/roles.ts";

const as = (role) => ({ role });

test("супер адмін має консоль і всю робочу логіку, але не команду компанії", () => {
  for (const p of ["console", "search", "analyze", "reports", "reportsAll", "save", "pdf", "expert", "settings"]) assert.ok(can(as("superadmin"), p), p);
  assert.equal(can(as("superadmin"), "team"), false);
});

test("адмін компанії: команда, активність, звіти компанії, без пошуку й аналізу", () => {
  for (const p of ["team", "activity", "reportsAll", "settings"]) assert.ok(can(as("admin"), p), p);
  for (const p of ["search", "analyze", "save", "pdf", "expert", "console"]) assert.equal(can(as("admin"), p), false, p);
});

test("керівник команди: пошук, аналіз, звіти, команда й активність, без налаштувань і консолі", () => {
  for (const p of ["search", "analyze", "reports", "save", "pdf", "team", "activity"]) assert.ok(can(as("lead"), p), p);
  for (const p of ["reportsAll", "settings", "expert", "console"]) assert.equal(can(as("lead"), p), false, p);
});

test("менеджер: пошук, аналіз, звіти, збереження й PDF без жодних підписок", () => {
  for (const p of ["search", "analyze", "reports", "save", "pdf"]) assert.ok(can(as("manager"), p), p);
  for (const p of ["team", "settings", "expert", "reportsAll"]) assert.equal(can(as("manager"), p), false, p);
});

test("СТО: звіти компанії та навчання моделі", () => {
  for (const p of ["reports", "reportsAll", "expert"]) assert.ok(can(as("expert"), p), p);
  for (const p of ["search", "analyze", "save", "pdf"]) assert.equal(can(as("expert"), p), false, p);
});

test("маршрути та домашні сторінки", () => {
  assert.equal(routePermission("/"), "analyze");
  assert.equal(routePermission("/report/abc"), "reports");
  assert.equal(routePermission("/admin/company/1"), "console");
  assert.equal(routePermission("/billing"), null);
  assert.equal(homeFor("superadmin"), "/admin");
  assert.equal(homeFor("admin"), "/activity");
  assert.equal(homeFor("expert"), "/expert");
  assert.equal(homeFor("manager"), "/");
  assert.equal(homeFor("lead"), "/");
});

test("запрошення: адмін кличе керівника, керівник лише менеджера", async () => {
  const { INVITABLE_BY_ADMIN, INVITABLE_BY_LEAD, INVITABLE_BY_SUPERADMIN } = await import("../src/lib/shared/roles.ts");
  assert.deepEqual(INVITABLE_BY_LEAD, ["manager"]);
  assert.ok(INVITABLE_BY_ADMIN.includes("lead"));
  assert.ok(!INVITABLE_BY_SUPERADMIN.includes("lead"));
});
