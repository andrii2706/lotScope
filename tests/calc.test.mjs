import assert from "node:assert/strict";
import { test } from "node:test";
import { ageCoefficient, calculate, exciseEur, pensionPct } from "../src/lib/calc.ts";
import { DEFAULT_SETTINGS, EMPTY_LOT } from "../src/lib/defaults.ts";

const NOW = new Date("2026-06-01");
const settings = { ...DEFAULT_SETTINGS, eurUsd: 1.158 };
const line = (result, key) => result.groups.flatMap((g) => g.lines).find((l) => l.key === key).usd;

test("коефіцієнт віку: рік розрахунку − рік випуску − 1, у межах 1–15", () => {
  assert.equal(ageCoefficient(2020, NOW), 5);
  assert.equal(ageCoefficient(2026, NOW), 1);
  assert.equal(ageCoefficient(2025, NOW), 1);
  assert.equal(ageCoefficient(2000, NOW), 15);
});

test("акциз: ставки за типом пального та об'ємом", () => {
  const lot = { ...EMPTY_LOT, year: 2020 };
  assert.equal(exciseEur({ ...lot, fuel: "petrol", engineCc: 2500 }, NOW), 625);
  assert.equal(exciseEur({ ...lot, fuel: "petrol", engineCc: 3500 }, NOW), 100 * 3.5 * 5);
  assert.equal(exciseEur({ ...lot, fuel: "diesel", engineCc: 2000 }, NOW), 75 * 2 * 5);
  assert.equal(exciseEur({ ...lot, fuel: "diesel", engineCc: 4000 }, NOW), 150 * 4 * 5);
  assert.equal(exciseEur({ ...lot, fuel: "hybrid", engineCc: 2500 }, NOW), 625);
  assert.equal(exciseEur({ ...lot, fuel: "electric", batteryKwh: 75 }, NOW), 75);
});

test("опублікований приклад: Toyota RAV4 2020, бензин 2.5 л", () => {
  const lot = { ...EMPTY_LOT, make: "Toyota", model: "RAV4", year: 2020, fuel: "petrol", engineCc: 2500, bidUsd: 10200 };
  const r = calculate(lot, settings, { auctionFeeUsd: 1150, inlandUsUsd: 0, oceanUsd: 1600 }, { min: 0, max: 0 }, NOW);
  assert.equal(r.customsValueUsd, 12950);
  assert.equal(line(r, "duty"), 1295);
  assert.equal(line(r, "excise"), 724);
  assert.equal(line(r, "vat"), 2994);
});

test("опублікований приклад: Tesla Model Y 2021, 75 кВт·год", () => {
  const lot = { ...EMPTY_LOT, make: "Tesla", model: "Model Y", year: 2021, fuel: "electric", batteryKwh: 75, bidUsd: 11500 };
  const r = calculate(lot, settings, { auctionFeeUsd: 1158, inlandUsUsd: 0, oceanUsd: 1600 }, { min: 0, max: 0 }, NOW);
  assert.equal(line(r, "duty"), 0);
  assert.equal(line(r, "excise"), 87);
  assert.equal(line(r, "vat"), 2869);
  assert.equal(line(r, "pension"), 0);
});

test("пенсійний збір: пороги 165 і 290 прожиткових мінімумів", () => {
  const lot = { ...EMPTY_LOT, fuel: "petrol" };
  const s = { ...settings, usdUah: 40, subsistenceMinUah: 3328 };
  assert.equal(pensionPct(lot, 549120 / 40, s), 3);
  assert.equal(pensionPct(lot, 549120 / 40 + 1, s), 4);
  assert.equal(pensionPct(lot, 965120 / 40, s), 4);
  assert.equal(pensionPct(lot, 965120 / 40 + 1, s), 5);
  assert.equal(pensionPct({ ...lot, fuel: "electric" }, 50000, s), 0);
});

test("разом = сума всіх статей, вилка відповідає ремонту", () => {
  const lot = { ...EMPTY_LOT, make: "BMW", model: "330i GT", year: 2019, engineCc: 2000, bidUsd: 6000, marketPriceUsd: 22000 };
  const r = calculate(lot, settings, {}, { min: 600, max: 1500 }, NOW);
  const sum = r.groups.reduce((s, g) => s + g.subtotal, 0);
  assert.ok(Math.abs(sum - r.totalMidUsd) <= 8, `${sum} vs ${r.totalMidUsd}`);
  assert.equal(r.totalMaxUsd - r.totalMinUsd, 900);
  assert.equal(r.savingsUsd, 22000 - r.totalMidUsd);
});

test("максимальна ставка зберігає цільову вигоду при верхній межі ремонту", () => {
  const lot = { ...EMPTY_LOT, make: "BMW", model: "330i GT", year: 2019, engineCc: 2000, bidUsd: 6000, marketPriceUsd: 22000 };
  const repair = { min: 600, max: 1500 };
  const r = calculate(lot, settings, {}, repair, NOW);
  const budget = 22000 * (1 - settings.targetSavingsPct / 100);
  const at = calculate({ ...lot, bidUsd: r.maxBidUsd }, settings, {}, repair, NOW);
  const above = calculate({ ...lot, bidUsd: r.maxBidUsd + 50 }, settings, {}, repair, NOW);
  assert.ok(at.totalMaxUsd <= budget + 1, `${at.totalMaxUsd} > ${budget}`);
  assert.ok(above.totalMaxUsd > budget, `${above.totalMaxUsd} <= ${budget}`);
});

test("без ринкової ціни максимальна ставка не рахується", () => {
  const lot = { ...EMPTY_LOT, make: "BMW", model: "X", year: 2019, bidUsd: 5000 };
  assert.equal(calculate(lot, settings, {}, { min: 0, max: 0 }, NOW).maxBidUsd, null);
});
