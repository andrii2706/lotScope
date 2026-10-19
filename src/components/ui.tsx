"use client";

import { Check, CircleAlert, CircleCheck, Info } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 sm:mb-9">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-line2 bg-surface px-3 py-1 text-xs font-bold text-accent-text">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[26px] font-semibold leading-[1.15] tracking-tight sm:text-4xl">
          {title}
        </h1>
        {description && <p className="mt-3 text-base leading-relaxed text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StepCard({
  step,
  title,
  hint,
  done,
  badge,
  children,
  id,
}: {
  step: number;
  title: string;
  hint?: string;
  done: boolean;
  badge?: "required" | "recommended" | "optional";
  children: ReactNode;
  id?: string;
}) {
  const badgeText = { required: "Обов'язково", recommended: "Рекомендовано", optional: "За бажанням" };
  return (
    <section id={id} className="card rise p-5 sm:p-7">
      <header className="mb-5 flex items-start gap-3.5">
        <span
          aria-hidden
          className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-extrabold transition-colors ${
            done ? "bg-good text-on-ink" : "bg-panel2 text-ink ring-1 ring-line2"
          }`}
        >
          {done ? <Check className="size-4.5" strokeWidth={3} /> : step}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold leading-tight tracking-tight">{title}</h2>
          {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
        </div>
        {badge && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              done
                ? "bg-good-bg text-good"
                : badge === "required"
                  ? "bg-panel2 text-ink ring-1 ring-line2"
                  : "bg-panel2 text-muted"
            }`}
          >
            {done ? "Готово" : badgeText[badge]}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

export function Card({
  title,
  hint,
  icon,
  children,
  className = "",
  id,
}: {
  title?: string;
  hint?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`card p-5 sm:p-7 ${className}`}>
      {title && (
        <header className="mb-5 flex items-start gap-3">
          {icon && (
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-panel2 text-accent-text ring-1 ring-line2">
              {icon}
            </span>
          )}
          <div>
            <h2 className="text-lg font-extrabold leading-tight tracking-tight">{title}</h2>
            {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
          </div>
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  required,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-bold text-ink/80">
        {label}
        {required && (
          <span className="text-accent-text" aria-hidden>
            {" "}
            *
          </span>
        )}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function NumberInput({
  value,
  onChange,
  placeholder = "0",
  step,
  min = 0,
  suffix,
  large,
}: {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  step?: number;
  min?: number;
  suffix?: string;
  large?: boolean;
}) {
  return (
    <span className="relative block">
      <input
        type="number"
        inputMode="decimal"
        className={`control ${suffix ? "pr-12" : ""} ${large ? "!min-h-13 !text-xl !font-extrabold" : ""}`}
        value={value === 0 ? "" : value}
        min={min}
        step={step}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.target.value === "" ? 0 : Number(e.target.value);
          onChange(Number.isFinite(next) ? next : 0);
        }}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-3.5 grid place-items-center text-sm font-semibold text-faint">
          {suffix}
        </span>
      )}
    </span>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  className = "",
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="mb-1.5 block text-[13px] font-bold text-ink/80">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex min-h-11 gap-1 rounded-xl border border-line2 bg-paper p-1"
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={`flex-1 rounded-lg px-2 py-1.5 text-[13px] font-bold leading-tight transition ${
                active
                  ? "bg-panel2 text-ink ring-1 ring-line2"
                  : "text-muted hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "lg";
}) {
  const styles = {
    primary:
      "bg-accent text-accent-ink hover:brightness-110 active:brightness-95 disabled:bg-panel2 disabled:text-faint disabled:hover:brightness-100",
    secondary: "border border-line2 bg-surface text-ink hover:bg-panel2",
    ghost: "text-muted hover:bg-ink/5 hover:text-ink",
    danger: "text-bad hover:bg-bad-bg",
  }[variant];
  const sizes = { md: "min-h-11 px-4 text-sm", lg: "min-h-13 px-6 text-base" }[size];
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition disabled:cursor-not-allowed ${sizes} ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Notice({
  tone,
  title,
  children,
}: {
  tone: "warn" | "bad" | "good" | "info";
  title?: string;
  children: ReactNode;
}) {
  const styles = {
    warn: "border-warn/25 bg-warn-bg text-warn",
    bad: "border-bad/25 bg-bad-bg text-bad",
    good: "border-good/25 bg-good-bg text-good",
    info: "border-line2 bg-surface text-accent-text",
  }[tone];
  const Icon = { warn: CircleAlert, bad: CircleAlert, good: CircleCheck, info: Info }[tone];
  return (
    <div role="status" className={`flex gap-3 rounded-2xl border px-4 py-3.5 text-sm ${styles}`}>
      <Icon className="mt-0.5 size-5 shrink-0" strokeWidth={2.2} />
      <div>
        {title && <p className="font-extrabold">{title}</p>}
        <div className="leading-relaxed text-ink/80">{children}</div>
      </div>
    </div>
  );
}
