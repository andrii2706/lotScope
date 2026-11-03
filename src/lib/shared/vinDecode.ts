import type { VinDecoded } from "@/types/auction";
import type { FuelType } from "@/types/report";

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(str(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

function fuelOf(v: string): FuelType | undefined {
  const s = v.toLowerCase();
  if (!s) return undefined;
  if (s.includes("hybrid")) return "hybrid";
  if (s.includes("electric") || s === "bev") return "electric";
  if (s.includes("diesel")) return "diesel";
  if (s.includes("gas") || s.includes("petrol") || s.includes("flex")) return "petrol";
  return undefined;
}

export function mapVinDecoding(raw: unknown): VinDecoded | null {
  const d = isRec(raw) && isRec(raw.data) ? raw.data : isRec(raw) ? raw : null;
  if (!d) return null;
  const engine = isRec(d.engine) ? d.engine : {};
  const make = str(d.make);
  const year = Math.round(num(d.year));
  if (!make && !year) return null;
  const liters = num(engine.displacement_l ?? d.displacement_l);
  return {
    make,
    model: [str(d.model), str(d.trim)].filter(Boolean).join(" "),
    year,
    engineCc: liters > 0 && liters < 10 ? Math.round(liters * 1000) : 0,
    fuel: fuelOf(str(engine.fuel ?? d.fuel)),
    plantCountry: str(d.plant_country),
    plantCity: str(d.plant_city),
    bodyClass: str(d.body_class),
    driveType: str(d.drive_type),
  };
}
