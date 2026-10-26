"use client";

import { TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useSyncExternalStore } from "react";

type Tone = "danger" | "default";

interface Request {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  resolve: (ok: boolean) => void;
}

let current: Request | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function confirmDialog(options: Omit<Request, "resolve">): Promise<boolean> {
  current?.resolve(false);
  return new Promise((resolve) => {
    current = { ...options, resolve };
    emit();
  });
}

function close(ok: boolean) {
  const req = current;
  current = null;
  emit();
  req?.resolve(ok);
}

export function ConfirmHost() {
  const req = useSyncExternalStore(subscribe, () => current, () => null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!req) return;
    const before = document.activeElement as HTMLElement | null;
    const focusTarget = req.tone === "danger" ? cancelRef.current : confirmRef.current;
    focusTarget?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Tab") {
        const items = [cancelRef.current, confirmRef.current].filter(Boolean) as HTMLElement[];
        const i = items.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, [req]);

  if (!req) return null;
  const danger = req.tone === "danger";

  return (
    <div className="no-print fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={() => close(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={req.message ? "confirm-message" : undefined}
        onMouseDown={(e) => e.stopPropagation()}
        className="card rise relative w-full max-w-md p-6"
      >
        <button
          type="button"
          aria-label="Закрити"
          onClick={() => close(false)}
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-muted transition hover:bg-panel2 hover:text-ink"
        >
          <X className="size-4.5" />
        </button>
        <div className="flex gap-4">
          {danger && (
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-bad-bg text-bad">
              <TriangleAlert className="size-5" />
            </span>
          )}
          <div className="min-w-0 pr-6">
            <h2 id="confirm-title" className="text-lg font-extrabold tracking-tight">
              {req.title}
            </h2>
            {req.message && (
              <p id="confirm-message" className="mt-1.5 text-sm leading-relaxed text-muted">
                {req.message}
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => close(false)}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-line2 bg-surface px-5 text-sm font-bold transition hover:bg-panel2"
          >
            {req.cancelLabel ?? "Скасувати"}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => close(true)}
            className={`inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-extrabold transition hover:brightness-110 ${
              danger ? "bg-bad text-on-ink" : "bg-accent text-accent-ink"
            }`}
          >
            {req.confirmLabel ?? "Підтвердити"}
          </button>
        </div>
      </div>
    </div>
  );
}
