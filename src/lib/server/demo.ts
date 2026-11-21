import type { Analysis } from "@/types/report";

export const DEMO_ANALYSIS: Analysis = {
  summary:
    "Приклад звіту. Боковий удар у нижню частину задньої дверки: дверка зім'ята й розірвана, її потрібно міняти. Салон чистий, шторка безпеки не спрацювала. Головне відкрите питання — стан порога та основи середньої стійки за дверкою, на фото їх не видно.",
  verdict: "caution",
  conditionScore: 72,
  impactZone: "задня дверка, нижня передня частина",
  structuralRisk: "medium",
  structuralRiskNote:
    "Удар прийшовся низько, навпроти порога та основи середньої стійки. Обшивку дверки всередину не вдавило, тож серйозна деформація малоймовірна, але фото цього не підтверджують.",
  airbagAssessment: "not_deployed",
  airbagNote: "Шторка над дверима не висить, стеля рівна, ремені не заблоковані.",
  damagedParts: [
    {
      part: "Задня дверка",
      action: "replace",
      severity: "severe",
      confidence: "high",
      costMinUsd: 350,
      costMaxUsd: 650,
      note: "Метал розірваний, рихтувати недоцільно. Б/у дверка з фарбуванням у колір.",
    },
    {
      part: "Накладка порога",
      action: "replace",
      severity: "moderate",
      confidence: "medium",
      costMinUsd: 80,
      costMaxUsd: 180,
      note: "Схоже, зачеплена в зоні удару.",
    },
    {
      part: "Поріг",
      action: "inspect",
      severity: "moderate",
      confidence: "low",
      costMinUsd: 0,
      costMaxUsd: 700,
      note: "Не видно на фото. Якщо зім'ятий — витягування й фарбування.",
    },
    {
      part: "Заднє крило біля арки",
      action: "inspect",
      severity: "minor",
      confidence: "low",
      costMinUsd: 0,
      costMaxUsd: 250,
      note: "Відблиски можуть ховати дрібну вм'ятину.",
    },
  ],
  scenarios: [
    {
      name: "Пошкоджена лише дверка",
      description: "Поріг і стійка цілі. Заміна дверки, накладки порога, фарбування.",
      likelihood: "high",
      repairMinUsd: 500,
      repairMaxUsd: 900,
    },
    {
      name: "Зім'ятий поріг",
      description: "До заміни дверки додається витягування та фарбування порога.",
      likelihood: "medium",
      repairMinUsd: 1000,
      repairMaxUsd: 1800,
    },
    {
      name: "Зачеплена основа стійки",
      description: "Потрібен стапель і відновлення геометрії прорізу.",
      likelihood: "low",
      repairMinUsd: 2500,
      repairMaxUsd: 4000,
    },
  ],
  repairMinUsd: 600,
  repairMaxUsd: 1500,
  redFlags: ["Місце удару збігається з порогом і основою середньої стійки, а їх на фото не видно."],
  positives: [
    "Подушки й шторка безпеки не спрацювали.",
    "Зазор між передньою та задньою дверкою рівний.",
    "Заднє колесо стоїть рівно, скло ціле.",
    "Двигун заводиться.",
  ],
  missingViews: [
    "Фото з відчиненою пошкодженою дверкою: поріг і низ стійки.",
    "Днище з боку удару.",
    "Заднє колесо й важелі зблизька.",
  ],
  inspectionChecklist: [
    "Замовити огляд лота з фото порога та стійки.",
    "Перевірити історію за VIN: чи це єдине ДТП і чи рівно ріс пробіг.",
    "Переконатися, що в описі немає Undercarriage або Water/Flood.",
    "Уточнити тип документа: Salvage проходить, Certificate of Destruction — ні.",
  ],
  photoNotes: [
    { photo: 1, observation: "Глибокий удар у нижню частину дверки, метал розірваний, залом іде до ручки." },
    { photo: 2, observation: "Салон чистий, обшивка дверки на місці, шторка не спрацювала." },
  ],
  vinOnPhoto: "",
  odometerOnPhoto: "",
  listingConflicts: [],
  historyProvided: false,
  historySummary: "",
  historyFindings: [],
  historyMileage: "unknown",
};

export const DEMO_ANALYSIS_PL: Analysis = {
  ...DEMO_ANALYSIS,
  summary:
    "Przykładowy raport. Uderzenie boczne w dolną część tylnych drzwi: drzwi są zgniecione i rozerwane, trzeba je wymienić. Wnętrze czyste, kurtyna powietrzna nie wystrzeliła. Główne otwarte pytanie to stan progu i podstawy słupka B za drzwiami — na zdjęciach ich nie widać.",
  impactZone: "tylne drzwi, dolna przednia część",
  structuralRiskNote:
    "Uderzenie było nisko, na wysokości progu i podstawy słupka B. Poszycie drzwi nie wgniotło się do środka, więc poważna deformacja jest mało prawdopodobna, ale zdjęcia tego nie potwierdzają.",
  airbagNote: "Kurtyna nad drzwiami nie wisi, podsufitka równa, pasy nie są zablokowane.",
  damagedParts: [
    { ...DEMO_ANALYSIS.damagedParts[0], part: "Tylne drzwi", note: "Blacha rozerwana, prostowanie się nie opłaca. Używane drzwi z lakierowaniem w kolor." },
    { ...DEMO_ANALYSIS.damagedParts[1], part: "Nakładka progu", note: "Wygląda na zahaczoną w strefie uderzenia." },
    { ...DEMO_ANALYSIS.damagedParts[2], part: "Próg", note: "Niewidoczny na zdjęciach. Jeśli jest zgnieciony — wyciąganie i lakierowanie." },
    { ...DEMO_ANALYSIS.damagedParts[3], part: "Błotnik tylny przy nadkolu", note: "Odblaski mogą ukrywać drobne wgniecenie." },
  ],
  scenarios: [
    { ...DEMO_ANALYSIS.scenarios[0], name: "Uszkodzone tylko drzwi", description: "Próg i słupek całe. Wymiana drzwi, nakładki progu, lakierowanie." },
    { ...DEMO_ANALYSIS.scenarios[1], name: "Zgnieciony próg", description: "Do wymiany drzwi dochodzi wyciąganie i lakierowanie progu." },
    { ...DEMO_ANALYSIS.scenarios[2], name: "Zahaczona podstawa słupka", description: "Potrzebna rama naprawcza i przywrócenie geometrii otworu." },
  ],
  redFlags: ["Miejsce uderzenia pokrywa się z progiem i podstawą słupka B, a tych nie widać na zdjęciach."],
  positives: [
    "Poduszki i kurtyna powietrzna nie wystrzeliły.",
    "Szczelina między przednimi a tylnymi drzwiami jest równa.",
    "Tylne koło stoi prosto, szyby całe.",
    "Silnik się uruchamia.",
  ],
  missingViews: [
    "Zdjęcie z otwartymi uszkodzonymi drzwiami: próg i dół słupka.",
    "Podwozie od strony uderzenia.",
    "Tylne koło i wahacze z bliska.",
  ],
  inspectionChecklist: [
    "Zamówić oględziny lotu ze zdjęciami progu i słupka.",
    "Sprawdzić historię VIN: czy to jedyna szkoda i czy przebieg rósł równo.",
    "Upewnić się, że w opisie nie ma Undercarriage ani Water/Flood.",
    "Sprawdzić typ dokumentu: Salvage da się zarejestrować, Certificate of Destruction — nie.",
  ],
  photoNotes: [
    { photo: 1, observation: "Głębokie uderzenie w dolną część drzwi, blacha rozerwana, załamanie sięga klamki." },
    { photo: 2, observation: "Wnętrze czyste, boczek drzwi na miejscu, kurtyna nie wystrzeliła." },
  ],
};

export const demoAnalysis = (market: "ua" | "pl"): Analysis => (market === "pl" ? DEMO_ANALYSIS_PL : DEMO_ANALYSIS);
