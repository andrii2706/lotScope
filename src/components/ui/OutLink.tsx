"use client";

import { ClipboardCheck, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { OutboundLink } from "@/types/ui";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function OutLink({ link, className }: { link: OutboundLink; className?: string }) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(""), 5000);
    return () => clearTimeout(t);
  }, [note]);

  const onClick = () => {
    if (!link.copy) return;
    const value = link.copy;
    void copyText(value).then((ok) =>
      setNote(ok ? `VIN ${value} скопійовано. Вставте його в поле пошуку на сайті ${link.label}.` : `Вставте на сайті ${link.label} VIN ${value}.`),
    );
  };

  return (
    <>
      <a href={link.href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={className}>
        {link.label} <ExternalLink className="size-3.5" />
      </a>
      {note &&
        createPortal(
          <div
            role="status"
            className="fixed bottom-5 left-1/2 z-[60] flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-start gap-2.5 rounded-xl border border-line2 bg-surface px-4 py-3 text-sm font-medium text-ink shadow-[var(--pop-shadow)]"
          >
            <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-accent-text" />
            <span>{note}</span>
          </div>,
          document.body,
        )}
    </>
  );
}
