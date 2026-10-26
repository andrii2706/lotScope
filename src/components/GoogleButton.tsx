"use client";

import { useEffect, useState } from "react";

export function useGoogleEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((d: { google?: boolean }) => alive && setEnabled(Boolean(d.google)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return enabled;
}

export function GoogleButton({ invite, next, label = "Продовжити з Google" }: { invite?: string; next?: string; label?: string }) {
  const enabled = useGoogleEnabled();
  if (!enabled) return null;
  const params = new URLSearchParams();
  if (invite) params.set("invite", invite);
  if (next) params.set("next", next);
  const href = `/api/auth/google/start${params.size ? `?${params}` : ""}`;
  return (
    <div className="space-y-4">
      <a href={href} className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-line2 bg-surface text-sm font-extrabold hover:bg-panel2">
        <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
          <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
        </svg>
        {label}
      </a>
      <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-faint">
        <span className="h-px flex-1 bg-line" /> або <span className="h-px flex-1 bg-line" />
      </p>
    </div>
  );
}
