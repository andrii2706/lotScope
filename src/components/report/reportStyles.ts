import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import type { Level, PartAction } from "@/types/report";

export const VERDICT_ICON = {
  buy: CircleCheck,
  caution: TriangleAlert,
  avoid: CircleX,
};

export const ACTION_STYLE: Record<PartAction, string> = {
  replace: "bg-bad-bg text-bad",
  repair: "bg-warn-bg text-warn",
  paint: "bg-panel2 text-ink",
  inspect: "bg-panel2 text-muted",
};

export const LEVEL_DOTS: Record<Level, number> = { low: 1, medium: 2, high: 3 };

export const DOT = { good: "bg-good", warn: "bg-warn", bad: "bg-bad" };
