import { test } from "node:test";
import assert from "node:assert/strict";
import { photoProxyUrl, safePhotoUrl, verifyPhoto } from "../src/lib/server/photos.ts";

test("посилання на фото лота підписане і не підробляється", () => {
  const url = "https://cs.copart.com/v1/AUTH_svc/lpp/0123/a_ful.jpg";
  const proxy = new URL(photoProxyUrl(url, "secret"), "http://x");
  assert.equal(proxy.pathname, "/api/lot/photo");
  assert.equal(proxy.searchParams.get("u"), url);
  const sig = proxy.searchParams.get("s");
  assert.ok(verifyPhoto(url, sig, "secret"));
  assert.ok(!verifyPhoto("https://evil.example/a.jpg", sig, "secret"));
  assert.ok(!verifyPhoto(url, sig, "other"));
  assert.ok(!verifyPhoto(url, "", "secret"));
  assert.ok(!verifyPhoto(url, sig, ""));
});

test("фото лише з публічних https-адрес", () => {
  assert.ok(safePhotoUrl("https://img.example.com/1.jpg"));
  assert.equal(safePhotoUrl("http://img.example.com/1.jpg"), null);
  assert.equal(safePhotoUrl("https://127.0.0.1/1.jpg"), null);
  assert.equal(safePhotoUrl("https://localhost/1.jpg"), null);
});
