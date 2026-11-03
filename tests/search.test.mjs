import { test } from "node:test";
import assert from "node:assert/strict";
import { auctionSearchLinks, filterLots, mapActiveLot, splitResults } from "../src/lib/shared/search.ts";

const NOW = Date.parse("2026-10-12T12:00:00Z");
const raw = {
  data: [
    { vin: "A1", make: "BMW", model: "3 Series", year: 2019, history: [{ auction: "copart", lot_number: "111", auction_date: "2026-10-13T18:00:00Z", odometer: 30000, primary_damage: "Rear End", run_status: "Run & Drive", current_bid: 4000, photos: ["https://cdn.x/1.jpg"] }] },
    { vin: "A2", make: "BMW", model: "3 Series", year: 2018, history: [{ auction: "iaai", lot_number: "222", auction_date: "2026-10-12T20:00:00Z", odometer: 70000, primary_damage: "Water/Flood", current_bid: 2000 }] },
    { vin: "A3", make: "BMW", model: "3 Series", year: 2019, sale_price: 9000, history: [{ auction: "iaai", lot_number: "333", sale_status: "Sold", final_bid: 9000 }] },
    { vin: "A4", make: "BMW", model: "3 Series", year: 2019, history: [{ auction: "copart", lot_number: "444", auction_date: "2026-09-01T18:00:00Z" }] },
  ],
};

test("відокремлює активні лоти від проданих і минулих", () => {
  const { active, comparables } = splitResults(raw, NOW);
  assert.deepEqual(active.map((l) => l.lotNumber), ["222", "111"]);
  assert.equal(comparables.medianUsd, 9000);
});

test("мапить лот з посиланням і фото", () => {
  const lot = mapActiveLot(raw.data[0]);
  assert.equal(lot.auction, "Copart");
  assert.equal(lot.url, "https://www.copart.com/lot/111");
  assert.equal(lot.photo, "https://cdn.x/1.jpg");
  assert.equal(lot.currentBidUsd, 4000);
});

test("фільтри", () => {
  const { active } = splitResults(raw, NOW);
  const base = { make: "BMW", model: "", yearFrom: 0, yearTo: 0, maxMiles: 0, maxBidUsd: 0, auction: "all", damages: [], excludeFlood: true, excludeDeployed: false, runDriveOnly: false };
  assert.deepEqual(filterLots(active, base).map((l) => l.lotNumber), ["111"]);
  assert.deepEqual(filterLots(active, { ...base, excludeFlood: false, auction: "IAAI" }).map((l) => l.lotNumber), ["222"]);
  assert.equal(filterLots(active, { ...base, maxMiles: 20000 }).length, 0);
  assert.equal(filterLots(active, { ...base, damages: ["Front End"] }).length, 0);
  assert.equal(filterLots(active, { ...base, runDriveOnly: true }).length, 1);
});

test("посилання на пошук аукціонів", () => {
  assert.equal(auctionSearchLinks({ make: "BMW", model: "330i", auction: "all" }).length, 2);
  assert.equal(auctionSearchLinks({ make: "BMW", model: "", auction: "IAAI" })[0].href, "https://www.iaai.com/Search?Keyword=BMW");
});

test("відповідь постачальника з ключем result читається так само, як data", () => {
  const wrapped = { pagination: { total: 1 }, result: raw.data };
  assert.equal(splitResults(wrapped, NOW).active.length, splitResults(raw, NOW).active.length);
  assert.ok(splitResults(wrapped, NOW).active.length > 0);
});

test("модель фільтрується локально і розуміє серії", async () => {
  const { modelMatches, paginationOf } = await import("../src/lib/shared/search.ts");
  assert.ok(modelMatches("330I XDRIVE", "330"));
  assert.ok(modelMatches("330i", "3 Series"));
  assert.ok(!modelMatches("X5", "3 Series"));
  assert.deepEqual(paginationOf({ pagination: { current_page: 2, total_pages: 7, total: 321 } }), { page: 2, totalPages: 7, total: 321 });
});

test("AUTO.RIA: підбір моделі та статистика цін", async () => {
  const { matchMake, matchModel, statsFrom } = await import("../src/lib/shared/autoriaMatch.ts");
  const marks = [{ name: "BMW", value: 9 }, { name: "Mercedes-Benz", value: 48 }, { name: "Toyota", value: 79 }];
  assert.equal(matchMake(marks, "bmw").value, 9);
  assert.equal(matchMake(marks, "Mercedes Benz").value, 48);
  const bmw = [{ name: "3 Series", value: 1 }, { name: "3 Series GT", value: 2 }, { name: "X5", value: 3 }];
  assert.equal(matchModel(bmw, "BMW", "330i Gran Turismo xDrive").value, 2);
  assert.equal(matchModel(bmw, "BMW", "330i").value, 1);
  assert.equal(matchModel(bmw, "BMW", "X5 xDrive40i").value, 3);
  const toyota = [{ name: "RAV4", value: 5 }, { name: "Camry", value: 6 }];
  assert.equal(matchModel(toyota, "Toyota", "RAV4 XLE").value, 5);
  assert.equal(matchModel(toyota, "Toyota", "Supra"), undefined);
  const merc = [{ name: "C-Class", value: 7 }];
  assert.equal(matchModel(merc, "Mercedes-Benz", "C 300 4MATIC").value, 7);
  assert.deepEqual(statsFrom([14000, 0, 15000, 16000, 20000]), { used: 4, medianUsd: 15500, p25Usd: 14750, p75Usd: 17000 });
  assert.equal(statsFrom([14000]), null);
});
