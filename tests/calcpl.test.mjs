import test from "node:test";
import assert from "node:assert/strict";
import { calculate, money } from "../src/lib/shared/calc.ts";
import { akcyzaPct, usBuiltVin } from "../src/lib/shared/calcPl.ts";
import { DEFAULT_SETTINGS, EMPTY_LOT, PL_DEFAULTS } from "../src/lib/shared/defaults.ts";
import { parseNbp } from "../src/lib/shared/rates.ts";

const S = {
  ...DEFAULT_SETTINGS,
  ...PL_DEFAULTS,
  auctionFeeMode: "manual",
  auctionFeePct: 0,
  auctionFeeFixedUsd: 1000,
  inlandUsUsd: 500,
  oceanUsd: 1500,
  usdPln: 4,
  plPortPln: 2000,
  plTransportPln: 2000,
  plRegistrationPln: 1000,
  plCompanyFeePln: 2000,
  plFirstServicePln: 0,
  targetSavingsPct: 15,
};
const LOT = { ...EMPTY_LOT, auction: "Copart", year: 2019, make: "BMW", model: "330i", fuel: "petrol", engineCc: 1998, bidUsd: 7000 };
const line = (cost, key) => cost.groups.flatMap((g) => g.lines).find((l) => l.key === key);

test("akcyza rates", () => {
  assert.equal(akcyzaPct({ fuel: "petrol", engineCc: 2000 }), 3.1);
  assert.equal(akcyzaPct({ fuel: "diesel", engineCc: 2001 }), 18.6);
  assert.equal(akcyzaPct({ fuel: "hybrid", engineCc: 1800 }), 1.55);
  assert.equal(akcyzaPct({ fuel: "hybrid", engineCc: 2500 }), 9.3);
  assert.equal(akcyzaPct({ fuel: "hybrid", engineCc: 3600 }), 18.6);
  assert.equal(akcyzaPct({ fuel: "electric", engineCc: 0 }), 0);
});

test("US auction lot cleared in Poland", () => {
  const cost = calculate(LOT, S, {}, { min: 1000, max: 2000 });
  assert.equal(cost.currency, "PLN");
  assert.equal(cost.rate, 4);
  assert.equal(cost.customsValueUsd, 10000);
  assert.equal(line(cost, "duty").usd, 1000);
  assert.equal(line(cost, "excise").usd, 341);
  assert.equal(line(cost, "vat").usd, Math.round((10000 + 1000 + 341) * 0.23 * 100) / 100);
  assert.equal(line(cost, "portUa").usd, 500);
  assert.equal(line(cost, "deliveryUa").usd, 500);
  assert.equal(line(cost, "pension"), undefined);
  const base = 10000 + 1000 + 341 + 11341 * 0.23 + 500 + 500 + 250 + 500;
  assert.ok(Math.abs(cost.totalMinUsd - (base + 1000)) < 0.01);
  assert.ok(Math.abs(cost.totalMaxUsd - (base + 2000)) < 0.01);
  assert.equal(money(cost.totalMinUsd, cost).endsWith(" zł"), true);
});

test("US-built car pays no duty, Germany clearance uses 19 % without excise in the base", () => {
  const cost = calculate({ ...LOT, usOrigin: true }, { ...S, plClearance: "de" }, {}, { min: 0, max: 0 });
  assert.equal(line(cost, "duty").usd, 0);
  assert.equal(line(cost, "excise").usd, 310);
  assert.equal(line(cost, "vat").usd, 1900);
  assert.equal(line(cost, "vat").label, "VAT 19 %");
});

test("EU auction lot: no duty, no import VAT, excise on the purchase price", () => {
  const cost = calculate({ ...LOT, auction: "CopartFinland" }, S, {}, { min: 0, max: 0 });
  assert.equal(line(cost, "duty"), undefined);
  assert.equal(line(cost, "vat"), undefined);
  assert.equal(line(cost, "excise").usd, 248);
  assert.equal(line(cost, "portUa"), undefined);
});

test("market price in zloty drives the maximum bid", () => {
  const cost = calculate({ ...LOT, marketPricePln: 120000 }, S, {}, { min: 1000, max: 2000 });
  assert.equal(Math.round(cost.marketPriceUsd), 30000);
  assert.ok(cost.maxBidUsd > 0);
  const atMax = calculate({ ...LOT, marketPricePln: 120000, bidUsd: cost.maxBidUsd }, S, {}, { min: 1000, max: 2000 });
  assert.ok(atMax.totalMaxUsd <= 30000 * 0.85 + 0.01);
  const over = calculate({ ...LOT, marketPricePln: 120000, bidUsd: cost.maxBidUsd + 100 }, S, {}, { min: 1000, max: 2000 });
  assert.ok(over.totalMaxUsd > 30000 * 0.85);
});

test("Ukrainian market is unchanged", () => {
  const cost = calculate(LOT, { ...S, market: "ua" }, {}, { min: 0, max: 0 });
  assert.equal(cost.currency, "USD");
  assert.ok(line(cost, "pension"));
});

test("US-built VIN", () => {
  assert.equal(usBuiltVin("5UXTY3C06L9C68166"), true);
  assert.equal(usBuiltVin("1G1RC6E45EU123456"), true);
  assert.equal(usBuiltVin("WBA5R7C51KAJ00000"), false);
  assert.equal(usBuiltVin("2C3CDXCT0JH000000"), false);
});

test("NBP table", () => {
  const r = parseNbp([{ table: "A", effectiveDate: "2026-11-20", rates: [{ code: "USD", mid: 3.71 }, { code: "EUR", mid: 4.26 }] }]);
  assert.deepEqual(r, { usdPln: 3.71, eurPln: 4.26, date: "2026-11-20" });
  assert.equal(parseNbp([{ rates: [{ code: "USD", mid: 3.7 }] }]), null);
});
