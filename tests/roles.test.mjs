import { test } from "node:test";
import assert from "node:assert/strict";
import { allows, can, homeFor, routePermission } from "../src/lib/roles.ts";
import { PLANS, plansFor } from "../src/lib/plans.ts";

const sub = (role, subscribed = true) => ({ role, subscribed });

test("супер адмін має лише консоль", () => {
  assert.ok(can(sub("superadmin"), "console"));
  for (const p of ["search", "analyze", "save", "pdf", "reports", "team"]) assert.equal(can(sub("superadmin"), p), false, p);
});

test("адмін компанії: команда, активність, звіти компанії, без пошуку й аналізу", () => {
  for (const p of ["team", "activity", "reportsAll", "billing", "settings"]) assert.ok(can(sub("admin"), p), p);
  for (const p of ["search", "analyze", "save", "pdf", "expert", "console"]) assert.equal(can(sub("admin"), p), false, p);
});

test("менеджер: пошук, аналіз, звіти, PDF; без команди й налаштувань", () => {
  for (const p of ["search", "analyze", "reports", "save", "pdf"]) assert.ok(can(sub("manager"), p), p);
  for (const p of ["team", "settings", "expert", "reportsAll", "billing"]) assert.equal(can(sub("manager"), p), false, p);
});

test("СТО: звіти компанії та навчання моделі", () => {
  for (const p of ["reports", "reportsAll", "expert"]) assert.ok(can(sub("expert"), p), p);
  for (const p of ["search", "analyze", "save", "pdf"]) assert.equal(can(sub("expert"), p), false, p);
});

test("простий користувач: збереження й PDF лише з підпискою", () => {
  assert.ok(can(sub("user", false), "search"));
  assert.ok(can(sub("user", false), "analyze"));
  assert.ok(can(sub("user", false), "reports"));
  assert.equal(can(sub("user", false), "save"), false);
  assert.equal(can(sub("user", false), "pdf"), false);
  assert.ok(can(sub("user", true), "save"));
  assert.ok(can(sub("user", true), "pdf"));
});

test("менеджер без підписки компанії теж не зберігає й не друкує", () => {
  assert.equal(can(sub("manager", false), "save"), false);
  assert.equal(can(sub("manager", false), "pdf"), false);
});

test("маршрути та домашні сторінки", () => {
  assert.equal(routePermission("/"), "analyze");
  assert.equal(routePermission("/report/abc"), "reports");
  assert.equal(routePermission("/admin/company/1"), "console");
  assert.equal(homeFor("superadmin"), "/admin");
  assert.equal(homeFor("admin"), "/activity");
  assert.equal(homeFor("expert"), "/expert");
  assert.equal(homeFor("manager"), "/");
  assert.ok(allows("user", "billing"));
});

test("тарифи: особистий лише для особистих акаунтів, командні лише для компаній", () => {
  const personal = plansFor("personal").map((p) => p.id);
  const team = plansFor("team").map((p) => p.id);
  assert.deepEqual(personal, ["personal", "pack20"]);
  assert.deepEqual(team, ["start", "team", "pack20"]);
  assert.ok(PLANS.personal.recurring);
});
