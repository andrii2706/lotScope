import { COPYRIGHT_OWNER, COPYRIGHT_SINCE } from "@/config/brand";
import { copyrightText } from "@/lib/shared/copyright";

export function Copyright({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-faint ${className}`} suppressHydrationWarning>
      {copyrightText(COPYRIGHT_OWNER, COPYRIGHT_SINCE, new Date().getFullYear())}
    </p>
  );
}
