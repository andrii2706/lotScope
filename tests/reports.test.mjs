import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHistoryDoc, rowToReport } from "../src/lib/server/reports.ts";

const pdf = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n").toString("base64");
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]).toString("base64");

test("файл історії: приймає справжні PDF і JPEG", () => {
  const doc = parseHistoryDoc({ name: "carfax/../report.pdf", mediaType: "application/pdf", data: pdf });
  assert.equal(doc.mediaType, "application/pdf");
  assert.equal(doc.name, "carfax..report.pdf");
  assert.equal(parseHistoryDoc({ name: "1.jpg", mediaType: "image/jpeg", data: jpeg }).mediaType, "image/jpeg");
});

test("файл історії: відхиляє підміну типу, порожні й чужі формати", () => {
  assert.equal(parseHistoryDoc({ name: "x.pdf", mediaType: "application/pdf", data: jpeg }), null);
  assert.equal(parseHistoryDoc({ name: "x.html", mediaType: "text/html", data: pdf }), null);
  assert.equal(parseHistoryDoc({ name: "x.pdf", mediaType: "application/pdf", data: "" }), null);
  assert.equal(parseHistoryDoc({ name: "x.pdf", mediaType: "application/pdf", data: "%%%" }), null);
});

test("звіт віддає посилання на збережені файли історії", () => {
  const report = rowToReport({
    id: "r1", user_id: "u1", author: "A", photos: 0, created_at: new Date("2026-11-07T10:00:00Z"),
    body: { lot: {}, analysis: {}, historyDocs: [{ n: 0, name: "carfax.pdf", mediaType: "application/pdf" }] },
  });
  assert.deepEqual(report.historyDocs, [{ name: "carfax.pdf", mediaType: "application/pdf", url: "/api/reports/r1/file/0" }]);
  assert.equal(rowToReport({ id: "r2", user_id: null, author: null, photos: 0, created_at: new Date(), body: {} }).historyDocs, undefined);
});
