import { test } from "node:test";
import assert from "node:assert/strict";
import { auctionSearchLinks, filterLots, mapActiveLot, splitResults } from "../src/lib/search.ts";

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
