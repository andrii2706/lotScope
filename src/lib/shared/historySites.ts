import type { OutboundLink } from "@/types/ui";

export const HISTORY_SITES = [
  { label: "Carfax", href: "https://www.carfax.com/Vehicle-History-Reports" },
  { label: "AutoCheck", href: "https://www.autocheck.com/vehiclehistory/" },
] as const;

export function historyLinks(vin: string): OutboundLink[] {
  return [
    ...HISTORY_SITES.map((s) => ({ label: s.label, href: s.href, copy: vin })),
    { label: "NHTSA: відкличні кампанії", href: `https://www.nhtsa.gov/recalls?vin=${encodeURIComponent(vin)}` },
  ];
}
