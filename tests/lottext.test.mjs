import test from "node:test";
import assert from "node:assert/strict";
import { damageText, titleInfo, titleText, mileageText, lotDescription, damagesText } from "../src/lib/shared/lotText.ts";

test("damage codes become Ukrainian", () => {
  assert.equal(damageText("Right Side"), "правий бік");
  assert.equal(damageText("FRONT END"), "передня частина");
  assert.equal(damageText("Burn - Engine"), "пожежа в моторному відсіку");
  assert.equal(damageText("Water / Flood"), "затоплення");
  assert.equal(damageText("Something New"), "Something New");
  assert.equal(damagesText({ primaryDamage: "Front End", secondaryDamage: "Rear End" }), "передня частина, додатково задня частина");
  assert.equal(damagesText({ primaryDamage: "Front End", secondaryDamage: "FRONT END" }), "передня частина");
});

test("title with state", () => {
  const t = titleInfo("Salvage (Mississippi)");
  assert.equal(t.label, "Salvage");
  assert.equal(t.region, "штат Міссісіпі");
  assert.match(t.note, /страховою/);
  assert.equal(titleText("TX - SALVAGE CERTIFICATE"), "Salvage, штат Техас");
  assert.equal(titleText("CERTIFICATE OF DESTRUCTION (FL)"), "Certificate of Destruction, штат Флорида");
  assert.equal(titleText("Clean Title"), "Clean");
  assert.equal(titleText("Rebuilt (ON)"), "Rebuilt, провінція Онтаріо");
  assert.equal(titleInfo(""), null);
});

test("mileage", () => {
  assert.equal(mileageText({ mileage: 1, mileageUnit: "mi" }), "пробіг не вказано");
  assert.equal(mileageText({ mileage: 0, mileageUnit: "mi" }), "");
  assert.equal(mileageText({ mileage: 52000, mileageUnit: "mi" }), `${(83668).toLocaleString("uk-UA")} км (${(52000).toLocaleString("uk-UA")} миль)`);
  assert.match(mileageText({ mileage: 21, mileageUnit: "mi" }), /21 миля\)$/);
  assert.match(mileageText({ mileage: 22, mileageUnit: "mi" }), /22 милі\)$/);
  assert.equal(mileageText({ mileage: 120000, mileageUnit: "km" }), `${(120000).toLocaleString("uk-UA")} км`);
});

test("lot description reads as sentences", () => {
  const lines = lotDescription({
    make: "BMW", model: "X3", year: 2020, mileage: 1, mileageUnit: "mi", fuel: "petrol", engineCc: 2000, batteryKwh: 0,
    auction: "IAAI", lotNumber: "1", vin: "", primaryDamage: "Right Side", secondaryDamage: "", airbags: "not_deployed",
    titleType: "Salvage (Mississippi)", runStatus: "run_drive", notes: "", bidUsd: 0, marketPriceUsd: 0,
  });
  assert.deepEqual(lines, [
    "Бензин, 2.0 л, пробіг не вказано.",
    "Пошкодження за даними аукціону: правий бік.",
    "Документ Salvage (штат Міссісіпі): списане страховою після пошкодження.",
    "Заводиться і їде, подушки безпеки цілі.",
  ]);
});

test("longest state name wins", () => {
  assert.equal(titleInfo("Salvage West Virginia").region, "штат Західна Вірджинія");
});

test("short mileage for header chips", async () => {
  const { mileageShort } = await import("../src/lib/shared/lotText.ts");
  assert.equal(mileageShort({ mileage: 52000, mileageUnit: "mi" }), `${(83668).toLocaleString("uk-UA")} км`);
  assert.equal(mileageShort({ mileage: 1, mileageUnit: "mi" }), "пробіг не вказано");
});
