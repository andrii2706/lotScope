import { test } from "node:test";
import assert from "node:assert/strict";
import { mapProviderRecord, parseLotQuery, priceStats, salePricesFrom, searchLinks } from "../src/lib/shared/auction.ts";

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
  assert.ok(links.some((l) => l.href.startsWith("https://www.carfax.com/") && l.copy === "WBA8Z9C50KB220000"));
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
  const { extractPhotos } = await import("../src/lib/shared/auction.ts");
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

test("підказки марок і моделей від двох символів", async () => {
  const { suggest, MAKES, modelsFor } = await import("../src/lib/shared/cars.ts");
  assert.deepEqual(suggest(MAKES, "b"), []);
  assert.ok(suggest(MAKES, "bm").includes("BMW"));
  assert.ok(suggest(modelsFor("bmw"), "3 s").includes("3 Series"));
  assert.ok(suggest(modelsFor("Невідома"), "rav").includes("RAV4"));
});

test("ціни запчастин: лише реальні посилання, перерахунок і нова вилка ремонту", async () => {
  const { parsePartsJson, partRange, revisedRepair, canonicalUrl } = await import("../src/lib/shared/partsPricing.ts");
  const seen = new Set([canonicalUrl("https://allegro.pl/oferta/zderzak-123"), canonicalUrl("https://www.olx.ua/d/uk/obyavlenie/bamper-IDabc.html")]);
  const text = 'Ось результат: {"parts":[{"part":"Передній бампер","offers":[' +
    '{"source":"Allegro","title":"Zderzak","price":800,"currency":"PLN","url":"https://allegro.pl/oferta/zderzak-123?bi_s=1","condition":"used"},' +
    '{"source":"OLX","title":"Бампер","price":8200,"currency":"UAH","url":"https://www.olx.ua/d/uk/obyavlenie/bamper-IDabc.html","condition":"used"},' +
    '{"source":"OLX","title":"Вигаданий","price":100,"currency":"UAH","url":"https://www.olx.ua/d/uk/obyavlenie/fake.html","condition":"used"}],' +
    '"laborHoursMin":2,"laborHoursMax":3,"paint":true,"note":"ok"}]}';
  const parts = parsePartsJson(text, seen, ["Передній бампер", "Фара права"]);
  assert.equal(parts.length, 2);
  assert.equal(parts[0].offers.length, 2);
  assert.equal(parts[1].offers.length, 0);
  const s = { plnUsd: 0.25, usdUah: 41, eurUsd: 1.16, laborRateUsd: 20, paintPerPanelUsd: 150, partsDeliveryPlUsd: 40 };
  const r = partRange(parts[0], s);
  assert.equal(r.partMinUsd, 200);
  assert.equal(r.partMaxUsd, 240);
  assert.equal(r.minUsd, 200 + 40 + 150);
  assert.equal(r.maxUsd, 240 + 60 + 150);
  const analysis = { repairMinUsd: 1000, repairMaxUsd: 2000, damagedParts: [{ part: "Передній бампер", costMinUsd: 500, costMaxUsd: 700 }] };
  const rev = revisedRepair(analysis, [r, partRange(parts[1], s)]);
  assert.deepEqual(rev, { minUsd: 1000 + 390 - 500, maxUsd: 2000 + 450 - 700, replaced: 1 });
});

test("нові аукціони: розпізнавання посилань і назв провайдера", async () => {
  const { auctionFromProvider, auctionLotUrl } = await import("../src/lib/shared/auctions.ts");
  assert.equal(auctionFromProvider("COPART CANADA"), "CopartCanada");
  assert.equal(auctionFromProvider("COPART FINLAND"), "CopartFinland");
  assert.equal(auctionFromProvider("EMIRATES AUCTION"), "Emirates");
  assert.equal(auctionFromProvider("COPART"), "Copart");
  assert.equal(auctionFromProvider("IAAI"), "IAAI");
  assert.equal(parseLotQuery("https://www.copart.ca/lot/45678901/clean-title").auction, "CopartCanada");
  const fi = parseLotQuery("https://www.copart.fi/en/lot/50572997");
  assert.equal(fi.kind, "lot");
  assert.equal(fi.value, "50572997");
  assert.equal(fi.auction, "CopartFinland");
  assert.equal(auctionLotUrl("CopartFinland", "50572997"), "https://www.copart.fi/en/lot/50572997");
  const prices = salePricesFrom({ result: [
    { history: [{ sale_status: "Sold", final_bid: 9000, auction: "COPART" }] },
    { history: [{ sale_status: "Sold", final_bid: 30000, auction: "EMIRATES AUCTION" }] },
  ] }, ["Copart", "IAAI"]);
  assert.deepEqual(prices, [9000]);
});

test("декодер VIN: мапінг відповіді постачальника", async () => {
  const { mapVinDecoding } = await import("../src/lib/shared/vinDecode.ts");
  const d = mapVinDecoding({ result: true, data: { vin: "5UXWX9C57D0A29763", make: "BMW", model: "X3", year: 2013, trim: "xDrive28i",
    engine: { displacement_l: 2.0, cylinders: 4, fuel: "Gasoline" }, plant_country: "United States", plant_city: "Spartanburg" } });
  assert.equal(d.make, "BMW");
  assert.equal(d.model, "X3 xDrive28i");
  assert.equal(d.engineCc, 2000);
  assert.equal(d.fuel, "petrol");
  assert.equal(d.plantCountry, "United States");
  assert.equal(mapVinDecoding({ result: false }), null);
  const { isEuPlant } = await import("../src/lib/shared/auctions.ts");
  assert.equal(isEuPlant("Germany"), true);
  assert.equal(isEuPlant("United States"), false);
});

test("лот без дати аукціону мапиться з поточного запису, продажі беруться з датованих", () => {
  const raw = {
    data: {
      vin: "WBA8Z9C50KB220000", make: "BMW", model: "330i", year: 2019,
      history: [
        { auction: "copart", lot_number: "111", sale_date: "2025-03-01", sale_status: "Sold", final_bid: 7000, odometer: 20000 },
        { auction: "iaai", lot_number: "999", odometer: 21000, primary_damage: "Front End" },
      ],
    },
  };
  const mapped = mapProviderRecord(raw);
  assert.equal(mapped.lot.lotNumber, "999");
  assert.equal(mapped.lot.mileage, 21000);
  assert.deepEqual(salePricesFrom({ data: [raw.data] }), [7000]);
});
