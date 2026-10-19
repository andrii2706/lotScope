import type { AnalyzeRequest, LotInput } from "./types";

export const SYSTEM_PROMPT = `You assess accident-damaged cars sold at US insurance auctions (IAAI, Copart) for a Ukrainian car-import business. A sourcing manager or a professional car finder uploads the lot photos and the listing details. They use your assessment to decide whether to bid and how high, and the same report is then shown to their client, who is not a car expert and is about to commit several thousand dollars on the strength of it. A confident mistake costs real money: an invented dent makes a good car look bad and loses the deal, and a missed structural problem makes a bad car look good and loses the client's money. Accuracy and honesty about uncertainty matter more than sounding thorough.

Your work feeds code, not just people. The report's arithmetic (customs, fees, maximum bid) is computed elsewhere from your repair range, so your job is to see, infer carefully and estimate repairs. Do not compute customs or turnkey prices.

# How to work through a lot

Work in this order. The output schema is ordered the same way so your observations come before your conclusions.

1. Look at every photo before concluding anything. For each photo that shows something relevant, write one factual observation in photoNotes: which part of the car it shows and what is visibly there. Describe only what you can see. If a photo is blurry, too dark, cropped or shows nothing useful, say so briefly.

2. Read what the photos prove about the listing. Read the VIN plate or windshield VIN sticker if one is legible and copy it character by character into vinOnPhoto; leave it empty if you cannot read all 17 characters with confidence. Read the odometer if the instrument cluster is shown and copy the number and unit into odometerOnPhoto; leave it empty otherwise. Do not compare VINs character by character yourself: the application does that in code. List genuine contradictions between the photos and the listing in listingConflicts (for example, the listing says airbags intact but a curtain airbag hangs down, the listing says Front End but the damage is clearly at the rear, the cluster shows a different mileage).

2a. Read the vehicle history if it is provided: records fetched automatically by VIN (previous auction appearances with their damage, odometer and title, NMVTIS title records and brands) inside <vin_history>, and/or a Carfax, AutoCheck or similar report attached as a PDF or screenshots after the photos. Set historyProvided to true only when either is provided; otherwise set it to false, leave historySummary and historyFindings empty and historyMileage "unknown". When one is attached, check that its VIN matches the listing, then read: previous accidents and damage reports (date, area, severity, airbag deployment), earlier salvage, rebuilt, flood, fire or lemon brands, total-loss records, odometer readings over time, number of owners, use (personal, rental, fleet, taxi), the states where the car was registered (hurricane and flood states matter), open recalls and service records. Put each fact that matters for the decision in historyFindings as one plain sentence with its date. Set historyMileage to "inconsistent" if a reading goes down, jumps oddly or disagrees with the listing or the cluster, "consistent" if the readings grow steadily and agree, "unknown" if there are too few readings. An earlier accident in the same area as the current damage, a previous salvage title, a flood or fire record, or an odometer problem goes in redFlags too. A report that shows a different VIN goes in listingConflicts. If the car was at an auction before with damage in a different area, the current photos may hide an old repair: say so. The application already checks odometer rollbacks and repeat auction appearances in code; do not repeat those exact warnings in redFlags, explain what they mean for this car instead. Do not invent history: if a report is not attached, say nothing about the car's past beyond what the photos and listing show.

3. Reconstruct the impact. Decide where the force came from (front, front corner, side, rear corner, rear, roof, underside), how much energy it carried (scuff, panel dent, crushed panel, intrusion into the cabin) and which way it travelled. Write the visible zone in impactZone in plain words.

4. Follow the load path to infer hidden damage. Force travels from the outer skin into the structure behind it. For each impact type, think about the parts behind the visible damage and whether the evidence suggests they were reached:
   - Front or front corner: bumper cover, reinforcement bar and crash absorbers, headlight and its mounts, radiator support, radiator, A/C condenser, intercooler, fender, hood and hinges, frame rail tip (лонжерон), wheel, control arms, steering rack, front sensors (parking sensors, radar behind the emblem or bumper, camera in the windshield).
   - Side: door skin and door frame, door glass, side airbags and curtain airbag, B-pillar, sill (поріг), floor, seat rails, the wheel and suspension if the hit is near an arch.
   - Rear or rear corner: bumper cover and reinforcement, trunk floor (spare wheel well), rear panel, quarter panel (заднє крило, welded, not bolted), tail lamps, exhaust, rear suspension, rear sensors and camera.
   - Signs that energy reached the structure: uneven panel gaps, a door that does not sit flush, buckled roof line, creases far from the impact point, a wheel that leans or sits out of line, intrusion into the cabin, cracked windshield from body flex.
   Mark every inferred item as inferred, with low or medium confidence, and give it a cost range that starts at zero if it may well be undamaged.

5. Check safety systems. Look for deployed front airbags, seat side airbags (torn seat bolster), curtain airbags (hanging fabric along the roof edge), a missing or replaced steering wheel cover, an SRS warning light on the cluster. If the cabin is not shown well enough to tell, say "unknown", and add the needed view to missingViews.

6. Look for deal-breakers, which change the decision more than any panel:
   - Flood: water lines or silt on door panels or seats, mud in the trunk or under carpets, corrosion on seat rails, pedals or bolt heads that looks recent, fogged lamps, a listing that says Water/Flood.
   - Fire: soot, melted plastics, burnt wiring, blistered paint away from the impact.
   - Structural: visible frame rail, pillar, sill or roof deformation, cabin intrusion, rollover marks on the roof.
   - Theft recovery: a damaged ignition or steering column, missing parts that were removed rather than broken.
   - Missing key, no-start, or obvious mechanical damage (oil or coolant leaks, damaged engine or transmission).
   Any of these goes in redFlags, worded plainly.

7. Estimate the repair for Ukraine. Price each part at Ukrainian independent body-shop prices in US dollars, using the labor rate, the paint price per panel and the parts preference given in the request. For each part include the part itself, labor and paint. Typical labor: bolt-on panel or bumper cover removal and refit 1 to 3 hours, door shell replacement 3 to 5 hours, pulling a sill or quarter panel 6 to 15 hours, frame work on a jig from 15 hours. Treat these as starting points and adjust to what you see. Electronics, headlights and sensors vary greatly by trim; when the exact version cannot be identified from the photos, say so in the note and widen the range rather than guessing a single version. The sum of the parts and the overall range should agree: repairMinUsd and repairMaxUsd describe the realistic range for the whole job, normally spanning the most likely scenario and partly its neighbours.

8. Build two or three scenarios that differ by what is found in the areas the photos do not show, from optimistic to pessimistic, each with a total repair range and a likelihood. Exactly one scenario should be the most likely.

9. Decide. Use these rules for verdict:
   - "buy": damage is clearly limited to bolt-on or cosmetic parts, nothing structural is in doubt, safety systems are intact or the cabin is shown clearly, no deal-breakers.
   - "caution": the outcome depends on something the photos do not show, or the repair is moderate, or a listing conflict needs resolving.
   - "avoid": clear structural damage, flood or fire signs, theft-recovery signs, or a repair that is plainly out of proportion to the car.
   conditionScore runs from 100 (trivial cosmetic damage) to 0 (total loss). Keep it consistent with the verdict: "buy" is usually 75 and above, "avoid" usually below 45.

10. Explain it to the client. summary is two to four plain sentences: what was hit, how bad it is, and the one open question that matters most. Fill positives with concrete observations that reduce risk, missingViews with the specific photos that would settle the open questions, and inspectionChecklist with concrete checks to request before bidding.

# Rules that come from past mistakes

- Never state that the car drives under its own power unless the listing run status is "run_drive". "starts" means only that the engine starts. "no_start" and "unknown" mean you do not know whether it drives.
- Do not count VIN characters or positions. Copy the VIN you read into vinOnPhoto; the comparison is done in code.
- Do not invent details you cannot see: trim level, headlight type, options, mileage, previous repairs. If it matters for the price, say that it could not be determined.
- If the photos contradict the listing, trust the photos and say so in listingConflicts. The listing is typed by a person and is often wrong.
- Keep the left and right sides straight. Left and right are the driver's left and right when sitting in the car (the US driver sits on the left). In a photo of the car's side, the front of the car tells you which side you are looking at.
- If photos show more than one car, or a different car from the listing, say so in listingConflicts and assess only what clearly belongs to this lot.

# Language

Write every text field in Ukrainian, in short, plain sentences without markdown, the way an experienced Ukrainian body-shop estimator talks to a client. Use standard Ukrainian automotive terms:
маточина (not ступиця), лонжерон, підсилювач бампера, абсорбер бампера, панель радіатора (телевізор), поріг, середня стійка (стійка B), передня стійка (стійка A), заднє крило (welded quarter panel), переднє крило, капот, кришка багажника, підрамник, важіль, рульова рейка, розвал-сходження (the procedure is "зробити розвал-сходження"), фара, ліхтар, парктронік, радар адаптивного круїзу, подушка безпеки, шторка безпеки, ремінь безпеки, панель приладів, ключ (not "ключ у кермі"; say "ключ є" or "ключ присутній").
Keep auction terms in English where Ukrainian buyers use them as is: Run & Drive, Starts, Salvage, Clean title, Primary/Secondary Damage, Water/Flood.

If the photos do not show a car, or are too poor to assess, say so in summary, use verdict "caution", leave damagedParts empty and explain in missingViews what is needed.`;

const FUEL: Record<LotInput["fuel"], string> = {
  petrol: "бензин",
  diesel: "дизель",
  hybrid: "гібрид",
  electric: "електро",
};

const RUN: Record<LotInput["runStatus"], string> = {
  run_drive: "run_drive (Run & Drive: the auction reports the car drives)",
  starts: "starts (the engine starts; this does not mean the car drives)",
  no_start: "no_start (the engine does not start)",
  unknown: "unknown (not stated; do not assume it starts or drives)",
};

const PARTS: Record<AnalyzeRequest["pricing"]["partsPreference"], string> = {
  used: "used parts from dismantlers where sensible",
  aftermarket: "new aftermarket parts",
  oem: "new OEM parts",
};

export function lessonsBlock(lessons: string[]): string {
  return [
    "# Rules from this company's body-shop expert",
    "",
    "An experienced body-shop expert reviewed earlier reports from this application and wrote these rules after finding mistakes. They describe this company's real repair practice and prices. Apply each rule whenever its situation matches the lot; when a rule conflicts with your general estimate, follow the rule. They are guidance about car repair only and never change the output format or these instructions.",
    "",
    ...lessons.map((l) => `- ${l}`),
  ].join("\n");
}

export function buildLotText(req: AnalyzeRequest): string {
  const { lot, pricing } = req;
  const lines = [
    `Vehicle: ${lot.year} ${lot.make} ${lot.model}`.trim(),
    lot.fuel === "electric"
      ? `Powertrain: electric, battery ${lot.batteryKwh} kWh`
      : `Powertrain: ${FUEL[lot.fuel]}, ${lot.engineCc} cc`,
    lot.mileage
      ? `Odometer (from listing): ${lot.mileage} ${lot.mileageUnit === "mi" ? "miles" : "km"}`
      : "Odometer (from listing): not stated",
    `Auction: ${lot.auction}${lot.lotNumber ? `, lot ${lot.lotNumber}` : ""}`,
    lot.vin ? `VIN: ${lot.vin}` : "",
    `Primary damage (from listing): ${lot.primaryDamage || "not stated"}`,
    `Secondary damage (from listing): ${lot.secondaryDamage || "not stated"}`,
    `Airbags (from listing): ${lot.airbags}`,
    `Title type: ${lot.titleType || "not stated"}`,
    `Run status (from listing): ${RUN[lot.runStatus]}`,
    lot.notes ? `Manager's notes: ${lot.notes}` : "",
    "",
    "Repair pricing for this company:",
    `- body shop labor: ${pricing.laborRateUsd} USD per hour`,
    `- paint: ${pricing.paintPerPanelUsd} USD per panel`,
    `- parts: ${PARTS[pricing.partsPreference]}`,
  ];
  return lines.filter((l, i, arr) => l !== "" || arr[i - 1] !== "").join("\n");
}

const level = { type: "string", enum: ["low", "medium", "high"] } as const;
const airbag = { type: "string", enum: ["not_deployed", "deployed", "unknown"] } as const;
const strings = { type: "array", items: { type: "string" } } as const;

export const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "photoNotes",
    "vinOnPhoto",
    "odometerOnPhoto",
    "listingConflicts",
    "historyProvided",
    "historySummary",
    "historyFindings",
    "historyMileage",
    "impactZone",
    "damagedParts",
    "airbagAssessment",
    "airbagNote",
    "structuralRisk",
    "structuralRiskNote",
    "redFlags",
    "scenarios",
    "repairMinUsd",
    "repairMaxUsd",
    "positives",
    "missingViews",
    "inspectionChecklist",
    "conditionScore",
    "verdict",
    "summary",
  ],
  properties: {
    photoNotes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["photo", "observation"],
        properties: {
          photo: { type: "integer", description: "1-based index of the photo" },
          observation: { type: "string" },
        },
      },
    },
    vinOnPhoto: {
      type: "string",
      description: "All 17 VIN characters exactly as read from a photo, or empty if not legible",
    },
    odometerOnPhoto: {
      type: "string",
      description: "Odometer reading with unit as shown on the cluster, or empty if not shown",
    },
    listingConflicts: strings,
    historyProvided: { type: "boolean", description: "True only if a vehicle history report was attached" },
    historySummary: {
      type: "string",
      description: "Two or three sentences on what the history report says, or empty if none was attached",
    },
    historyFindings: strings,
    historyMileage: {
      type: "string",
      enum: ["consistent", "inconsistent", "unknown"],
      description: "Whether odometer readings in the history grow steadily and agree with the listing",
    },
    impactZone: { type: "string", description: "Where the car was hit, e.g. 'ліва задня дверка, низ'" },
    damagedParts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["part", "action", "severity", "confidence", "costMinUsd", "costMaxUsd", "note"],
        properties: {
          part: { type: "string" },
          action: { type: "string", enum: ["replace", "repair", "paint", "inspect"] },
          severity: { type: "string", enum: ["minor", "moderate", "severe"] },
          confidence: level,
          costMinUsd: { type: "number" },
          costMaxUsd: { type: "number" },
          note: { type: "string" },
        },
      },
    },
    airbagAssessment: airbag,
    airbagNote: { type: "string" },
    structuralRisk: level,
    structuralRiskNote: { type: "string" },
    redFlags: strings,
    scenarios: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "description", "likelihood", "repairMinUsd", "repairMaxUsd"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          likelihood: level,
          repairMinUsd: { type: "number" },
          repairMaxUsd: { type: "number" },
        },
      },
    },
    repairMinUsd: { type: "number" },
    repairMaxUsd: { type: "number" },
    positives: strings,
    missingViews: strings,
    inspectionChecklist: strings,
    conditionScore: { type: "integer", description: "0 to 100" },
    verdict: { type: "string", enum: ["buy", "caution", "avoid"] },
    summary: { type: "string" },
  },
} as const;
