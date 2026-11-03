import type { LucideIcon } from "lucide-react";
import type { Permission } from "./auth";

export type Tone = "good" | "warn" | "bad";

export type NoticeTone = Tone | "info";

export type ConfirmTone = "danger" | "default";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
}

export interface AuthField {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
}

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

export interface OutboundLink {
  label: string;
  href: string;
  copy?: string;
}
