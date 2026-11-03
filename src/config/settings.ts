import { Landmark, Palette, Truck, Wrench } from "lucide-react";
import type { NumericSettingKey } from "@/types/report";

export const SETTINGS_SECTIONS = [
  { id: "brand", label: "Бренд у звіті", icon: Palette },
  { id: "logistics", label: "Логістика та послуги", icon: Truck },
  { id: "repair", label: "Ремонт", icon: Wrench },
  { id: "customs", label: "Курси та розмитнення", icon: Landmark },
];

export const REGION_ROWS: { label: string; keys: NumericSettingKey[] }[] = [
  { label: "Канада", keys: ["caInlandUsd", "caOceanUsd", "caPortUsd", "caDeliveryUsd"] },
  { label: "Європа (Фінляндія)", keys: ["euInlandUsd", "euOceanUsd", "euPortUsd", "euDeliveryUsd"] },
  { label: "ОАЕ", keys: ["aeInlandUsd", "aeOceanUsd", "aePortUsd", "aeDeliveryUsd"] },
];

export const ACCENTS = ["#2b59ff", "#0e7c66", "#7a5af8", "#101828", "#c2410c", "#be185d", "#0891b2", "#c8f542"];
