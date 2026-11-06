"use client";

import { ExternalLink, FileText, ImageIcon, TriangleAlert } from "lucide-react";
import type { HistoryDoc } from "@/types/report";

function openLocal(url: string) {
  const comma = url.indexOf(",");
  const type = url.slice(5, url.indexOf(";"));
  const bin = atob(url.slice(comma + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const href = URL.createObjectURL(new Blob([bytes], { type }));
  window.open(href, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}

export function HistoryDocs({ docs, names }: { docs?: HistoryDoc[]; names?: string[] }) {
  if (!docs) return null;
  const missing = (names ?? []).filter((n) => !docs.some((d) => d.name === n));
  if (!docs.length && !missing.length) return null;
  const cls = "inline-flex items-center gap-1.5 text-sm font-bold text-accent-text hover:underline";
  return (
    <div className="no-print mt-4 border-t border-line pt-4">
      <p className="mb-2 text-[13px] font-medium text-muted">Додані звіти історії</p>
      <ul className="space-y-1.5">
        {docs.map((d) => {
          const Icon = d.mediaType === "application/pdf" ? FileText : ImageIcon;
          const label = (
            <>
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{d.name}</span>
              <ExternalLink className="size-3.5 shrink-0" />
            </>
          );
          return (
            <li key={d.url} className="min-w-0">
              {d.url.startsWith("data:") ? (
                <button type="button" onClick={() => openLocal(d.url)} className={cls}>
                  {label}
                </button>
              ) : (
                <a href={d.url} target="_blank" rel="noopener noreferrer" className={cls}>
                  {label}
                </a>
              )}
            </li>
          );
        })}
        {missing.map((n) => (
          <li key={n} className="flex items-center gap-1.5 text-sm text-warn">
            <TriangleAlert className="size-4 shrink-0" />
            <span className="truncate">{n}: файл не вдалося зберегти, ШІ його врахував</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
