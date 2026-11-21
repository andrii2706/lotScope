"use client";

import { rememberLang, useLang } from "@/lib/client/lang";
import { t } from "@/lib/shared/i18n";
import type { Lang } from "@/lib/shared/i18n";

const OPTIONS: { value: Lang; label: string; name: string }[] = [
  { value: "uk", label: "UA", name: "Українська" },
  { value: "pl", label: "PL", name: "Polski" },
];

export function LangSwitch() {
  const lang = useLang();
  return (
    <div role="group" aria-label={t("Мова")} className="inline-flex rounded-lg border border-line p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          lang={o.value}
          aria-pressed={lang === o.value}
          title={o.name}
          onClick={() => rememberLang(o.value)}
          className={`h-7 min-w-9 rounded-md px-2 text-xs font-semibold transition ${lang === o.value ? "bg-ink text-on-ink" : "text-muted hover:text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
