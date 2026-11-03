import { test } from "node:test";
import assert from "node:assert/strict";
import { describeDbError } from "../src/lib/server/dberror.ts";
import { responseMessage, statusMessage, userMessage, NETWORK_MESSAGE, UNAVAILABLE_MESSAGE } from "../src/lib/shared/errors.ts";

const quiet = () => {
  const original = console.error;
  console.error = () => {};
  return () => (console.error = original);
};

test("помилки бази перетворюються на зрозумілі повідомлення", () => {
  assert.equal(describeDbError(Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), { code: "ECONNREFUSED" })).kind, "connect");
  assert.equal(describeDbError(new Error("timeout exceeded when trying to connect")).kind, "connect");
  assert.equal(describeDbError(Object.assign(new Error('relation "teams" does not exist'), { code: "42P01" })).kind, "schema");
  assert.equal(describeDbError(Object.assign(new Error("dup"), { code: "23505" })).status, 409);
  assert.equal(describeDbError(new Error("just a bug")), null);
  for (const code of ["ECONNREFUSED", "42P01", "28P01"]) {
    const message = describeDbError(Object.assign(new Error("x"), { code })).message;
    assert.equal(message, UNAVAILABLE_MESSAGE);
    assert.doesNotMatch(message, /DATABASE|env|Postgres|сервер|баз/i);
  }
});

test("на клієнті технічний текст не показується", () => {
  const restore = quiet();
  try {
    assert.equal(userMessage(new TypeError("Failed to fetch")), NETWORK_MESSAGE);
    assert.equal(userMessage(new Error("Unexpected token < in JSON"), "Запасний"), "Запасний");
    assert.equal(userMessage(new Error("Невірний email або пароль.")), "Невірний email або пароль.");
    assert.equal(responseMessage("/x", 500, null), UNAVAILABLE_MESSAGE);
    assert.equal(responseMessage("/x", 502, { error: "Bad gateway" }), UNAVAILABLE_MESSAGE);
    assert.equal(responseMessage("/x", 400, { error: "Оберіть роль." }), "Оберіть роль.");
    assert.match(statusMessage(413), /Забагато даних/);
  } finally {
    restore();
  }
});
