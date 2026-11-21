"use client";

import { COPYRIGHT_OWNER, COPYRIGHT_OWNER_LATIN, COPYRIGHT_SINCE } from "@/config/brand";
import { copyrightText } from "@/lib/shared/copyright";
import { useLang } from "@/lib/client/lang";

export function Copyright({ className = "" }: { className?: string }) {
  const owner = useLang() === "pl" ? COPYRIGHT_OWNER_LATIN : COPYRIGHT_OWNER;
  return (
    <p className={`text-xs text-faint ${className}`} suppressHydrationWarning>
      {copyrightText(owner, COPYRIGHT_SINCE, new Date().getFullYear())}
    </p>
  );
}
