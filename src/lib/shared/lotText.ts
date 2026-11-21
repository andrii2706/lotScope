import { FUEL } from "./labels.ts";
import { L, getLang, localeOf, t } from "./i18n.ts";
import type { LotInput } from "@/types/report";

const norm = (s: string) => s.toLowerCase().replace(/[‐-―]/g, "-").replace(/\s*([/-])\s*/g, "$1").replace(/\s+/g, " ").trim();

const DAMAGE: Record<string, string> = {
  "front end": "передня частина",
  front: "передня частина",
  "rear end": "задня частина",
  rear: "задня частина",
  "left side": "лівий бік",
  "right side": "правий бік",
  side: "бік",
  sides: "боки",
  "left front": "лівий передній кут",
  "right front": "правий передній кут",
  "left rear": "лівий задній кут",
  "right rear": "правий задній кут",
  "front & rear": "передня і задня частини",
  "all over": "пошкодження по всьому кузову",
  rollover: "перекидання",
  "top/roof": "дах",
  roof: "дах",
  undercarriage: "днище",
  mechanical: "механічна несправність",
  "engine damage": "двигун",
  "transmission damage": "коробка передач",
  suspension: "підвіска",
  electrical: "електрика",
  "frame damage": "рама",
  "water/flood": "затоплення",
  flood: "затоплення",
  "fresh water": "затоплення прісною водою",
  "salt water": "затоплення солоною водою",
  hail: "град",
  "storm damage": "негода",
  vandalism: "вандалізм",
  "minor dent/scratches": "дрібні вм'ятини й подряпини",
  "minor dents/scratches": "дрібні вм'ятини й подряпини",
  "normal wear": "звичайне зношення",
  burn: "пожежа",
  "burn-engine": "пожежа в моторному відсіку",
  "burn-interior": "пожежа в салоні",
  "burn-total": "повністю згоріле",
  "biohazard/chemical": "біологічне чи хімічне забруднення",
  stripped: "розукомплектоване",
  "missing/altered vin": "VIN відсутній або змінений",
  "replaced vin": "VIN замінено",
  theft: "після крадіжки",
  "damage history": "пошкодження в минулому",
  "partial repair": "частково відремонтоване",
  "rejected repair": "ремонт не прийнято",
  repossession: "вилучене за борги",
  "cash for clunkers": "утилізаційна програма",
  "mechanical/electrical": "механіка й електрика",
  unknown: "невідомо",
  none: "без пошкоджень",
};

export function damageText(raw: string): string {
  const key = norm(raw || "");
  if (!key) return "";
  return DAMAGE[key] ? t(DAMAGE[key]) : raw.trim();
}

const STATES: Record<string, string> = {
  AL: "Алабама", AK: "Аляска", AZ: "Аризона", AR: "Арканзас", CA: "Каліфорнія", CO: "Колорадо", CT: "Коннектикут",
  DE: "Делавер", DC: "Округ Колумбія", FL: "Флорида", GA: "Джорджія", HI: "Гаваї", ID: "Айдахо", IL: "Іллінойс",
  IN: "Індіана", IA: "Айова", KS: "Канзас", KY: "Кентуккі", LA: "Луїзіана", ME: "Мен", MD: "Меріленд",
  MA: "Массачусетс", MI: "Мічиган", MN: "Міннесота", MS: "Міссісіпі", MO: "Міссурі", MT: "Монтана", NE: "Небраска",
  NV: "Невада", NH: "Нью-Гемпшир", NJ: "Нью-Джерсі", NM: "Нью-Мексико", NY: "Нью-Йорк", NC: "Північна Кароліна",
  ND: "Північна Дакота", OH: "Огайо", OK: "Оклахома", OR: "Орегон", PA: "Пенсильванія", RI: "Род-Айленд",
  SC: "Південна Кароліна", SD: "Південна Дакота", TN: "Теннессі", TX: "Техас", UT: "Юта", VT: "Вермонт",
  VA: "Вірджинія", WA: "Вашингтон", WV: "Західна Вірджинія", WI: "Вісконсин", WY: "Вайомінг",
};

const PROVINCES: Record<string, string> = {
  ON: "Онтаріо", QC: "Квебек", AB: "Альберта", BC: "Британська Колумбія", MB: "Манітоба", SK: "Саскачеван",
  NS: "Нова Шотландія", NB: "Нью-Брансвік", NL: "Ньюфаундленд і Лабрадор", PE: "Острів Принца Едварда",
};

const STATE_NAMES: Record<string, string> = Object.fromEntries(
  [
    ["alabama", "AL"], ["alaska", "AK"], ["arizona", "AZ"], ["arkansas", "AR"], ["california", "CA"], ["colorado", "CO"],
    ["connecticut", "CT"], ["delaware", "DE"], ["district of columbia", "DC"], ["florida", "FL"], ["georgia", "GA"],
    ["hawaii", "HI"], ["idaho", "ID"], ["illinois", "IL"], ["indiana", "IN"], ["iowa", "IA"], ["kansas", "KS"],
    ["kentucky", "KY"], ["louisiana", "LA"], ["maine", "ME"], ["maryland", "MD"], ["massachusetts", "MA"],
    ["michigan", "MI"], ["minnesota", "MN"], ["mississippi", "MS"], ["missouri", "MO"], ["montana", "MT"],
    ["nebraska", "NE"], ["nevada", "NV"], ["new hampshire", "NH"], ["new jersey", "NJ"], ["new mexico", "NM"],
    ["new york", "NY"], ["north carolina", "NC"], ["north dakota", "ND"], ["ohio", "OH"], ["oklahoma", "OK"],
    ["oregon", "OR"], ["pennsylvania", "PA"], ["rhode island", "RI"], ["south carolina", "SC"], ["south dakota", "SD"],
    ["tennessee", "TN"], ["texas", "TX"], ["utah", "UT"], ["vermont", "VT"], ["virginia", "VA"], ["washington", "WA"],
    ["west virginia", "WV"], ["wisconsin", "WI"], ["wyoming", "WY"], ["ontario", "ON"], ["quebec", "QC"],
    ["alberta", "AB"], ["british columbia", "BC"], ["manitoba", "MB"], ["saskatchewan", "SK"], ["nova scotia", "NS"],
    ["new brunswick", "NB"],
  ],
);

function regionName(token: string): string {
  const value = token.trim();
  if (!value) return "";
  const up = value.toUpperCase();
  if (STATES[up]) return t("штат {v0}", { v0: t(STATES[up]) });
  if (PROVINCES[up]) return t("провінція {v0}", { v0: t(PROVINCES[up]) });
  const code = STATE_NAMES[value.toLowerCase()];
  if (code && STATES[code]) return t("штат {v0}", { v0: t(STATES[code]) });
  if (code && PROVINCES[code]) return t("провінція {v0}", { v0: t(PROVINCES[code]) });
  return "";
}

const TITLES: { test: RegExp; label: string; note: string }[] = [
  { test: /destruction|junk|\bcod\b|crush|scrap|dismantl/, label: "Certificate of Destruction", note: "лише на запчастини, зареєструвати авто не можна" },
  { test: /parts only/, label: "Parts Only", note: "продається на запчастини" },
  { test: /non[- ]?repairable|not repairable/, label: "Non-Repairable", note: "не підлягає відновленню" },
  { test: /rebuilt|reconstructed|restored|prior salvage/, label: "Rebuilt", note: "раніше було Salvage, відновлене й перевірене" },
  { test: /flood/, label: "Salvage Flood", note: "списане страховою після затоплення" },
  { test: /salvage|insurance|total loss/, label: "Salvage", note: "списане страховою після пошкодження" },
  { test: /bill of sale/, label: "Bill of Sale", note: "лише договір купівлі, без титулу" },
  { test: /clean|clear|\bcert(?:ificate)? of title\b|\bmv-?\d|original/, label: "Clean", note: "чистий документ, без позначок про списання" },
];

export interface TitleInfo {
  label: string;
  note: string;
  region: string;
  raw: string;
}

export function titleInfo(raw: string): TitleInfo | null {
  const value = (raw || "").trim();
  if (!value) return null;
  const lower = value.toLowerCase();
  let region = "";
  const paren = /\(([^)]+)\)/.exec(value);
  if (paren) region = regionName(paren[1]);
  if (!region) {
    const head = /^([A-Za-z]{2})\s*[-–:]\s*/.exec(value);
    const tail = /[-–,\s]\s*([A-Za-z]{2})$/.exec(value);
    region = regionName(head?.[1] ?? "") || regionName(tail?.[1] ?? "");
  }
  if (!region) {
    const name = Object.keys(STATE_NAMES).sort((a, b) => b.length - a.length).find((n) => new RegExp(`\\b${n}\\b`).test(lower));
    if (name) region = regionName(name);
  }
  const match = TITLES.find((t) => t.test.test(lower));
  return { label: match?.label ?? value.replace(/\s*\([^)]*\)\s*/g, " ").trim(), note: match?.note ? t(match.note) : "", region, raw: value };
}

export function titleText(raw: string): string {
  const t = titleInfo(raw);
  if (!t) return "";
  return [t.label, t.region].filter(Boolean).join(", ");
}

export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}

function milesWord(n: number): string {
  if (getLang() === "pl") {
    const a = Math.abs(n) % 100;
    const b = a % 10;
    if (n === 1) return "mila";
    if (b >= 2 && b <= 4 && !(a >= 12 && a <= 14)) return "mile";
    return "mil";
  }
  return plural(n, "миля", "милі", "миль");
}

export const NOT_ACTUAL_MILES = 10;

const notGiven = () => t("пробіг не вказано");

export function mileageText(lot: Pick<LotInput, "mileage" | "mileageUnit">): string {
  if (!lot.mileage || lot.mileage < 0) return "";
  if (lot.mileage <= NOT_ACTUAL_MILES) return notGiven();
  const km = lot.mileageUnit === "mi" ? Math.round(lot.mileage * 1.609) : Math.round(lot.mileage);
  const main = `${km.toLocaleString(localeOf())} ${t("км")}`;
  if (lot.mileageUnit !== "mi") return main;
  const mi = Math.round(lot.mileage);
  return `${main} (${mi.toLocaleString(localeOf())} ${milesWord(mi)})`;
}

export function mileageShort(lot: Pick<LotInput, "mileage" | "mileageUnit">): string {
  if (!lot.mileage || lot.mileage < 0) return "";
  if (lot.mileage <= NOT_ACTUAL_MILES) return notGiven();
  const km = lot.mileageUnit === "mi" ? Math.round(lot.mileage * 1.609) : Math.round(lot.mileage);
  return `${km.toLocaleString(localeOf())} ${t("км")}`;
}

export const RUN_TEXT: Record<LotInput["runStatus"], string> = L({
  run_drive: "заводиться і їде",
  starts: "заводиться, рух не перевіряли",
  no_start: "не заводиться",
  unknown: "",
});

export function engineText(lot: Pick<LotInput, "fuel" | "engineCc" | "batteryKwh">): string {
  if (lot.fuel === "electric") return lot.batteryKwh ? t("електро, батарея {v0} кВт·год", { v0: lot.batteryKwh }) : t("електро");
  return lot.engineCc ? t("{v0}, {v1} л", { v0: FUEL[lot.fuel], v1: (lot.engineCc / 1000).toLocaleString(localeOf(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }) : FUEL[lot.fuel];
}

export function damagesText(lot: Pick<LotInput, "primaryDamage" | "secondaryDamage">): string {
  const primary = damageText(lot.primaryDamage);
  const secondary = damageText(lot.secondaryDamage);
  if (!primary) return secondary;
  if (!secondary || secondary === primary) return primary;
  return t("{v0}, додатково {v1}", { v0: primary, v1: secondary });
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function lotDescription(lot: LotInput): string[] {
  const out: string[] = [];
  const mileage = mileageText(lot);
  const base = [cap(engineText(lot)), mileage && (mileage === notGiven() ? mileage : t("пробіг {v0}", { v0: mileage }))].filter(Boolean).join(", ");
  if (base) out.push(`${base}.`);
  const damage = damagesText(lot);
  if (damage) out.push(t("Пошкодження за даними аукціону: {v0}.", { v0: damage }));
  const title = titleInfo(lot.titleType);
  if (title) {
    const where = title.region ? ` (${title.region})` : "";
    out.push(t("Документ {v0}{v1}{v2}.", { v0: title.label, v1: where, v2: title.note ? `: ${title.note}` : "" }));
  }
  const state = [
    RUN_TEXT[lot.runStatus] ? cap(RUN_TEXT[lot.runStatus]) : "",
    lot.airbags === "deployed" ? t("подушки безпеки спрацювали") : lot.airbags === "not_deployed" ? t("подушки безпеки цілі") : "",
  ].filter(Boolean);
  if (state.length) out.push(`${cap(state.join(", "))}.`);
  return out;
}
