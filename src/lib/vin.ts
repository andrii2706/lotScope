const TRANSLIT: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export function cleanVin(vin: string): string {
  return vin.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function vinCheckDigitValid(vin: string): boolean | null {
  const v = cleanVin(vin);
  if (v.length !== 17 || /[IOQ]/.test(v)) return v.length === 17 ? false : null;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const ch = v[i];
    const value = /\d/.test(ch) ? Number(ch) : TRANSLIT[ch];
    if (value === undefined) return false;
    sum += value * WEIGHTS[i];
  }
  const remainder = sum % 11;
  const expected = remainder === 10 ? "X" : String(remainder);
  return v[8] === expected;
}

export interface VinMismatch {
  position: number;
  listing: string;
  photo: string;
}

export function compareVins(listing: string, photo: string): VinMismatch[] | null {
  const a = cleanVin(listing);
  const b = cleanVin(photo);
  if (a.length !== 17 || b.length !== 17) return null;
  const diffs: VinMismatch[] = [];
  for (let i = 0; i < 17; i++) {
    if (a[i] !== b[i]) diffs.push({ position: i + 1, listing: a[i], photo: b[i] });
  }
  return diffs;
}

export function vinFlags(listingVin: string, photoVin: string): string[] {
  const flags: string[] = [];
  const listing = cleanVin(listingVin);
  if (listing.length > 0 && listing.length !== 17) {
    flags.push(`VIN у картці лота має ${listing.length} символів замість 17. Перевірте, чи він введений повністю.`);
  } else if (listing.length === 17 && vinCheckDigitValid(listing) === false) {
    flags.push("Контрольна цифра VIN у картці лота не сходиться. Імовірна одруківка при введенні або змінений VIN.");
  }
  const diffs = compareVins(listing, photoVin);
  if (diffs && diffs.length > 0) {
    const where = diffs
      .map((d) => `${d.position}-й символ: у картці «${d.listing}», на фото «${d.photo}»`)
      .join("; ");
    flags.push(`VIN у картці лота не збігається з VIN на фото (${where}). Звірте VIN перед ставкою.`);
  }
  return flags;
}
