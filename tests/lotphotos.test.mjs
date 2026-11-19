import test from "node:test";
import assert from "node:assert/strict";
import { checkPhotoSignature, photoProxyPath, photoSignature, safePhotoUrl } from "../src/lib/server/lotPhotos.ts";

test("photo urls are limited to public https hosts", () => {
  assert.ok(safePhotoUrl("https://cs.copart.com/v1/a.jpg"));
  assert.equal(safePhotoUrl("http://cs.copart.com/a.jpg"), null);
  assert.equal(safePhotoUrl("https://127.0.0.1/a.jpg"), null);
  assert.equal(safePhotoUrl("https://localhost/a.jpg"), null);
  assert.equal(safePhotoUrl("https://db.internal/a.jpg"), null);
});

test("proxy links are signed with the session", () => {
  const url = "https://cs.copart.com/v1/a.jpg";
  const sig = photoSignature(url, "session-a");
  assert.ok(checkPhotoSignature(url, sig, "session-a"));
  assert.equal(checkPhotoSignature(url, sig, "session-b"), false);
  assert.equal(checkPhotoSignature("https://evil.example/x.jpg", sig, "session-a"), false);
  assert.equal(checkPhotoSignature(url, sig, ""), false);
  assert.match(photoProxyPath(url, "session-a"), /^\/api\/lot\/photo\?u=https%3A%2F%2Fcs\.copart\.com%2Fv1%2Fa\.jpg&s=/);
});
