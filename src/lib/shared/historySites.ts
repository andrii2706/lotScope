import type { OutboundLink } from "@/types/ui";
import { t, L } from "./i18n.ts";

export const HISTORY_SITES: readonly Omit<OutboundLink, "copy">[] = L([
  { label: "carVertical", href: "https://www.carvertical.com/ua" },
  { label: "ClearVIN", href: "https://www.clearvin.com/uk/" },
  { label: "Carfax", href: "https://www.carfax.com/Vehicle-History-Reports", note: "VPN США" },
  { label: "AutoCheck", href: "https://www.autocheck.com/vehiclehistory/", note: "VPN США" },
]);

export function historyLinks(vin: string): OutboundLink[] {
  return [
    ...HISTORY_SITES.map((s) => ({ ...s, copy: vin })),
    { label: t("NHTSA: відкличні кампанії"), href: `https://www.nhtsa.gov/recalls?vin=${encodeURIComponent(vin)}` },
  ];
}
