import { test } from "node:test";
import assert from "node:assert/strict";
import { historyToText, mapAuctionHistory, mapVinAudit, mileageIssues, previousAuctionFlags, sanitizeHistory } from "../src/lib/vinhistory.ts";

const auctionRaw = { data: { vin: "WBA8Z9C50JG827636", history: [
  { auction: "iaai", lot_number: "46058418", sale_date: "2026-05-01", sale_status: "On sale", odometer: 23600, primary_damage: "Left Rear" },
  { auction: "copart", lot_number: "111", sale_date: "2023-02-10", sale_status: "Sold", final_bid: 15200, odometer: 31000, primary_damage: "Front End" },
] } };

test("історія аукціонів сортується за датою", () => {
  const sales = mapAuctionHistory(auctionRaw);
  assert.deepEqual(sales.map((s) => s.lotNumber), ["111", "46058418"]);
  assert.equal(sales[0].priceUsd, 15200);
});

test("записи NMVTIS", () => {
  const m = mapVinAudit({ titles: [{ date: "2020-01-02", state: "FL", meter: "9800", meterUnit: "M" }], checks: [{ date: "2023-03-01", brandCode: "SV", disposition: "Salvage", branderName: "FL DMV" }], jsi: [{ date: "2023-02-15", recordType: "Insurance", branderName: "Progressive", branderState: "FL" }] });
  assert.equal(m.titleRecords[0].odometer, 9800);
  assert.equal(m.brands.length, 2);
  assert.equal(m.brands[0].source, "Progressive, FL");
});

test("ловить зменшення пробігу та попередні аукціони", () => {
  const h = sanitizeHistory({ vin: "WBA8Z9C50JG827636", sources: ["історія аукціонів"], auctionSales: mapAuctionHistory(auctionRaw), titleRecords: [], brands: [], fetchedAt: "x" });
  const issues = mileageIssues(h);
  assert.equal(issues.length, 1);
  assert.match(issues[0], /31[\s ]000 mi/);
  assert.match(previousAuctionFlags(h, "46058418")[0], /1 раз\(и\), продавалося 1/);
  assert.match(historyToText(h), /copart lot 111, status Sold, final bid 15200 USD/);
});

test("відкидає невалідну історію", () => {
  assert.equal(sanitizeHistory({ vin: "123" }), null);
  assert.equal(sanitizeHistory(null), null);
});
