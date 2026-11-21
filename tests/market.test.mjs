import test from "node:test";
import assert from "node:assert/strict";
import { SYSTEM_PROMPT, buildLotText, systemPrompt } from "../src/lib/server/prompt.ts";
import { demoAnalysis } from "../src/lib/server/demo.ts";
import { inviteEmail, resetEmail } from "../src/lib/server/mail.ts";
import { pricingSettings } from "../src/lib/shared/calcPl.ts";
import { DEFAULT_SETTINGS, EMPTY_LOT, PL_DEFAULTS } from "../src/lib/shared/defaults.ts";

test("Polish prompt asks for Polish text and Polish repair prices", () => {
  const pl = systemPrompt("pl");
  assert.match(pl, /Polish car-import business/);
  assert.match(pl, /Estimate the repair for Poland/);
  assert.match(pl, /Write every text field in Polish/);
  assert.doesNotMatch(pl, /Write every text field in Ukrainian/);
  assert.equal(systemPrompt("ua"), SYSTEM_PROMPT);
  const req = { lot: { ...EMPTY_LOT, make: "BMW", model: "X3", year: 2020 }, images: [], pricing: { laborRateUsd: 40, paintPerPanelUsd: 175, partsPreference: "used" } };
  assert.match(buildLotText(req, "pl"), /Polish shops/);
  assert.match(buildLotText(req, "ua"), /Ukrainian shops/);
});

test("demo report follows the market", () => {
  assert.match(demoAnalysis("pl").summary, /Przykładowy raport/);
  assert.match(demoAnalysis("ua").summary, /Приклад звіту/);
});

test("mail in Polish", () => {
  const invite = inviteEmail({ companyName: "AutoImport", roleLabel: "Handlowiec", inviter: "Piotr", link: "https://x/invite/1", days: 7, lang: "pl" });
  assert.equal(invite.subject, "Zaproszenie do LotScope: „AutoImport”");
  assert.match(invite.text, /Piotr zaprasza Cię do LotScope/);
  assert.match(invite.html, /<html lang="pl">/);
  const reset = resetEmail("Kasia", "https://x/reset", 60, "pl");
  assert.equal(reset.subject, "Zmiana hasła LotScope");
  assert.match(reset.text, /działa 60 minut/);
  assert.match(inviteEmail({ companyName: "A", roleLabel: "B", inviter: "", link: "l", days: 7 }).subject, /Запрошення/);
});

test("labor and paint for the AI come from zloty settings", () => {
  const s = pricingSettings({ ...DEFAULT_SETTINGS, ...PL_DEFAULTS, usdPln: 4, plLaborPln: 160, plPaintPln: 700 });
  assert.equal(s.laborRateUsd, 40);
  assert.equal(s.paintPerPanelUsd, 175);
  assert.equal(pricingSettings(DEFAULT_SETTINGS).laborRateUsd, DEFAULT_SETTINGS.laborRateUsd);
});
