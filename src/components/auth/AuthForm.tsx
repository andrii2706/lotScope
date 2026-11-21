"use client";

import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { refreshMe } from "@/lib/client/me";
import { Button, Field, Notice } from "@/components/ui";
import { userMessage, responseMessage } from "@/lib/shared/errors";
import type { AuthField } from "@/types/ui";
import { t } from "@/lib/shared/i18n";

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
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.filter((f) => f.defaultValue).map((f) => [f.name, f.defaultValue ?? ""])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};
    for (const f of fields) {
      const v = (values[f.name] ?? "").trim();
      if (!v) next[f.name] = t("Заповніть поле «{v0}».", { v0: f.label });
      else if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) next[f.name] = t("Перевірте email: схоже, в ньому помилка.");
    }
    setInvalid(next);
    const first = fields.find((f) => next[f.name]);
    if (first) document.querySelector<HTMLInputElement>(`input[name="${first.name}"]`)?.focus();
    return !first;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, ...extra }),
        signal: AbortSignal.timeout(25_000),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok || data?.error) throw new Error(responseMessage(endpoint, res.status, data, t("Не вдалося. Спробуйте ще раз.")));
      await refreshMe();
      onDone();
    } catch (err) {
      setError(userMessage(err, t("Не вдалося. Спробуйте ще раз.")));
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] sm:text-[32px]">{title}</h1>
      <div className="mt-2 text-[15px] text-muted">{description}</div>
      <form onSubmit={submit} noValidate className="mt-8 space-y-4">
        {fields.map((f) => {
          const secret = f.type === "password";
          const shown = secret && Boolean(visible[f.name]);
          return (
            <Field key={f.name} label={f.label} hint={f.hint}>
              <span className="relative block">
                <input
                  className="control"
                  style={secret ? { paddingRight: "2.75rem" } : undefined}
                  aria-label={secret ? f.label : undefined}
                  name={f.name}
                  type={shown ? "text" : (f.type ?? "text")}
                  autoCapitalize={secret ? "none" : undefined}
                  autoCorrect={secret ? "off" : undefined}
                  spellCheck={secret ? false : undefined}
                  autoComplete={f.autoComplete}
                  readOnly={f.readOnly}
                  required
                  aria-invalid={Boolean(invalid[f.name])}
                  aria-describedby={invalid[f.name] ? `${f.name}-error` : undefined}
                  value={values[f.name] ?? ""}
                  onChange={(e) => {
                    setValues((v) => ({ ...v, [f.name]: e.target.value }));
                    if (invalid[f.name]) setInvalid((m) => ({ ...m, [f.name]: "" }));
                  }}
                />
                {secret && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setVisible((v) => ({ ...v, [f.name]: !v[f.name] }))}
                    aria-label={shown ? t("Сховати пароль") : t("Показати пароль")}
                    aria-pressed={shown}
                    title={shown ? t("Сховати пароль") : t("Показати пароль")}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-[0.625rem] text-muted transition hover:text-ink"
                  >
                    {shown ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                  </button>
                )}
              </span>
              {invalid[f.name] && (
                <span id={`${f.name}-error`} className="mt-1.5 block text-xs font-bold text-bad">
                  {invalid[f.name]}
                </span>
              )}
            </Field>
          );
        })}
        {error && (
          <Notice tone="bad" title={t("Помилка")}>
            {error}
          </Notice>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <LoaderCircle className="size-5 animate-spin" />}
          {submitLabel}
        </Button>
        {social}
      </form>
      {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
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
