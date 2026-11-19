import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_UPLOAD_CHARS, parseUpload, pickUploads, uploadIds } from "../src/lib/server/uploads.ts";

const pdf = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n").toString("base64");
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]).toString("base64");
const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";

test("завантаження: фото приймає лише зображення, історія — PDF і зображення", () => {
  assert.equal(parseUpload({ kind: "photo", name: "1.jpg", mediaType: "image/jpeg", data: jpeg }).kind, "photo");
  assert.equal(parseUpload({ kind: "photo", name: "x.pdf", mediaType: "application/pdf", data: pdf }), null);
  assert.equal(parseUpload({ kind: "history", name: "carfax.pdf", mediaType: "application/pdf", data: pdf }).mediaType, "application/pdf");
  assert.equal(parseUpload({ kind: "history", name: "x.pdf", mediaType: "application/pdf", data: jpeg }), null);
  assert.equal(parseUpload({ kind: "other", name: "1.jpg", mediaType: "image/jpeg", data: jpeg }), null);
  assert.equal(parseUpload(null), null);
});

test("завантаження: відхиляє файл понад ліміт", () => {
  const big = jpeg + "A".repeat(MAX_UPLOAD_CHARS);
  assert.equal(parseUpload({ kind: "photo", name: "big.jpg", mediaType: "image/jpeg", data: big }), null);
});

test("список id: лише унікальні UUID у межах ліміту", () => {
  assert.deepEqual(uploadIds(undefined, 3), []);
  assert.deepEqual(uploadIds([a, b], 3), [a, b]);
  assert.equal(uploadIds([a, a], 3), null);
  assert.equal(uploadIds([a, b], 1), null);
  assert.equal(uploadIds(["../x"], 3), null);
  assert.equal(uploadIds("x", 3), null);
});

test("файли беруться в порядку id і лише потрібного виду", () => {
  const rows = [
    { id: b, kind: "photo", name: "2", media_type: "image/jpeg", data: "B" },
    { id: a, kind: "photo", name: "1", media_type: "image/jpeg", data: "A" },
  ];
  assert.deepEqual(pickUploads([a, b], "photo", rows).map((r) => r.data), ["A", "B"]);
  assert.equal(pickUploads([a], "history", rows), null);
  assert.equal(pickUploads(["33333333-3333-4333-8333-333333333333"], "photo", rows), null);
});
