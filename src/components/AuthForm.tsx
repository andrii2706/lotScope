"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { refreshMe } from "@/lib/me";
import { Button, Field, Notice } from "./ui";

export interface AuthField {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
}

export function AuthForm({
  title,
  description,
  fields,
  submitLabel,
  endpoint,
  extra,
  footer,
  social,
  onDone,
}: {
  title: string;
  description: ReactNode;
  fields: AuthField[];
  submitLabel: string;
  endpoint: string;
  extra?: Record<string, string>;
  footer?: ReactNode;
  social?: ReactNode;
  onDone: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, ...extra }),
        signal: AbortSignal.timeout(25_000),
      }).catch((e: Error) => {
        throw new Error(
          e.name === "TimeoutError"
            ? "Сервер не відповідає. Перевірте, що запущені npm run dev і база даних."
            : "Немає зв’язку із сервером.",
        );
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok || data?.error) throw new Error(data?.error || "Не вдалося. Спробуйте ще раз.");
      await refreshMe();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося. Спробуйте ще раз.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md pt-4 sm:pt-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-2 text-muted">{description}</div>
      <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
        {social}
        {fields.map((f) => (
          <Field key={f.name} label={f.label} hint={f.hint}>
            <input
              className="control"
              name={f.name}
              type={f.type ?? "text"}
              autoComplete={f.autoComplete}
              required
              value={values[f.name] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            />
          </Field>
        ))}
        {error && (
          <Notice tone="bad" title="Помилка">
            {error}
          </Notice>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <LoaderCircle className="size-5 animate-spin" />}
          {submitLabel}
        </Button>
      </form>
      {footer && <div className="mt-5 text-center text-sm text-muted">{footer}</div>}
    </div>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-bold text-accent-text hover:underline">
      {children}
    </Link>
  );
}

export function goTo(path: string) {
  window.location.replace(new URL(path, window.location.origin).href);
}
