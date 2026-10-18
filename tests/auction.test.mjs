import { test } from "node:test";
import assert from "node:assert/strict";
import { mapProviderRecord, parseLotQuery, priceStats, salePricesFrom, searchLinks } from "../src/lib/auction.ts";

test("парсить посилання Copart", () => {
  assert.deepEqual(parseLotQuery("https://www.copart.com/lot/71234567/clean-title-2019-bmw"), {
    kind: "lot", value: "71234567", auction: "Copart",
  });
});

test("парсить посилання IAAI", () => {
  const q = parseLotQuery("https://www.iaai.com/VehicleDetail/41234567~US");
  assert.equal(q.kind, "lot");
  assert.equal(q.value, "41234567");
  assert.equal(q.auction, "IAAI");
});

test("розпізнає VIN з пробілами і в посиланні bid.cars", () => {
  assert.deepEqual(parseLotQuery(" wba8z9c5 0kb220000 "), { kind: "vin", value: "WBA8Z9C50KB220000", auction: "Other" });
  const q = parseLotQuery("https://bid.cars/en/lot/1-46058418/2019-BMW-330I-WBA8Z9C50KB220000");
  assert.equal(q.kind, "vin");
  assert.equal(q.value, "WBA8Z9C50KB220000");
});

test("голий номер лота", () => {
  assert.deepEqual(parseLotQuery("46058418"), { kind: "lot", value: "46058418", auction: "Other" });
  assert.equal(parseLotQuery("hello").kind, "unknown");
});

test("посилання для VIN містять Carfax і AutoCheck", () => {
  const links = searchLinks(parseLotQuery("WBA8Z9C50KB220000"));
  assert.ok(links.some((l) => l.href.startsWith("https://www.carfax.com/") && l.href.endsWith("WBA8Z9C50KB220000")));
  assert.ok(links.some((l) => l.label === "AutoCheck"));
  assert.equal(searchLinks(parseLotQuery("")).length, 0);
});

test("статистика цін", () => {
  const s = priceStats([9000, 7000, 8000, 50, 10000, 6000]);
  assert.equal(s.count, 5);
  assert.equal(s.medianUsd, 8000);
  assert.equal(s.p25Usd, 7000);
  assert.equal(s.p75Usd, 9000);
  assert.equal(priceStats([]), null);
});

test("мапить запис постачальника", () => {
  const m = mapProviderRecord({
    result: true,
    data: {
      vin: "wba8z9c50kb220000", make: "BMW", model: "3 Series", year: "2019",
      history: [
        { auction: "copart", lot_number: "111", sale_date: "2024-01-01", sale_status: "Sold", final_bid: 5000, odometer: 10000 },
        { auction: "iaai", lot_number: "46058418", sale_date: "2026-05-01", sale_status: "Sold", final_bid: 9100, odometer: 23700,
          primary_damage: "Left Rear", title_type: "Salvage", engine: "2.0L 4", fuel: "Gasoline",
          photos: ["https://cdn.example.com/a.jpg", "http://insecure/b.jpg", { url: "https://cdn.example.com/c.jpg" }] },
      ],
    },
  });
  assert.equal(m.lot.vin, "WBA8Z9C50KB220000");
  assert.equal(m.lot.year, 2019);
  assert.equal(m.lot.auction, "IAAI");
  assert.equal(m.lot.lotNumber, "46058418");
  assert.equal(m.lot.mileage, 23700);
  assert.equal(m.lot.engineCc, 2000);
  assert.equal(m.lot.fuel, "petrol");
  assert.equal(m.lot.primaryDamage, "Left Rear");
  assert.deepEqual(m.photoUrls, ["https://cdn.example.com/a.jpg", "https://insecure/b.jpg", "https://cdn.example.com/c.jpg"]);
  assert.equal(m.lastSale.priceUsd, 9100);
  assert.equal(mapProviderRecord(null), null);
});

test("ціни продажів беруться лише з проданих лотів", () => {
  const prices = salePricesFrom({ data: [
    { sale_price: 8000, history: [{ sale_status: "Sold" }] },
    { history: [{ sale_status: "Sold", final_bid: 9000 }] },
    { history: [{ sale_status: "Not sold", final_bid: 1 }] },
    { sale_price: 0 },
  ] });
  assert.deepEqual(prices, [8000, 9000]);
});

test("знаходить фото під довільними ключами", async () => {
  const { extractPhotos } = await import("../src/lib/auction.ts");
  const urls = extractPhotos({
    vin: "X",
    link_img_hd: ["https://img.example.com/1_hd.jpg", "https://img.example.com/2_hd.jpg"],
    link_img_small: "https://img.example.com/1_thumb.jpg",
    nested: { gallery: "//img.example.com/3.jpg, //img.example.com/4.jpg" },
  });
  assert.ok(urls.includes("https://img.example.com/1_hd.jpg"));
  assert.ok(urls.includes("https://img.example.com/3.jpg"));
  assert.ok(!urls.some((u) => u.includes("thumb")));
});
