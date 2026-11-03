import { DOT } from "./reportStyles";
import { type ReactNode } from "react";
import { TONE_TEXT } from "@/lib/shared/labels";
import type { Tone } from "@/types/ui";

export function Block({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="mt-8 min-w-0 scroll-mt-24">
      <h2 className="mb-3 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export function Kpi({
  label,
  value,
  note,
  tone,
  action,
}: {
  label: string;
  value: string;
  note: string;
  tone?: Tone;
  action?: () => void;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-panel2 px-3 py-2.5">
      <p className="truncate text-xs font-medium text-muted">{label}</p>
      <p className={`mt-0.5 truncate text-[17px] font-semibold tracking-tight ${tone ? TONE_TEXT[tone] : ""}`}>{value}</p>
      {action ? (
        <button type="button" onClick={action} className="text-xs font-semibold text-accent-text hover:underline">
          Вказати ринок
        </button>
      ) : (
        <p className="truncate text-xs text-faint">{note}</p>
      )}
    </div>
  );
}

export function Fact({
  icon,
  label,
  value,
  note,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note?: string;
  tone?: Tone;
}) {
  return (
    <div className="card p-5">
      <p className="flex items-center gap-2 text-xs font-bold text-muted">
        {icon} {label}
      </p>
      <p className="mt-2 flex items-center gap-2 text-[17px] font-semibold leading-snug">
        {tone && (
          <span
            aria-hidden
            className={`size-2.5 shrink-0 rounded-full ${DOT[tone]}`}
          />
        )}
        <span
          className={`first-letter:uppercase ${tone ? TONE_TEXT[tone] : ""}`}
        >
          {value}
        </span>
      </p>
      {note && (
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{note}</p>
      )}
    </div>
  );
}

export function ListBlock({
  icon,
  title,
  items,
  tone,
  empty,
}: {
  icon: ReactNode;
  title: string;
  items: string[];
  tone?: Tone;
  empty: string;
}) {
  const badge = tone
    ? {
        good: "bg-good-bg text-good",
        warn: "bg-warn-bg text-warn",
        bad: "bg-bad-bg text-bad",
      }[tone]
    : "bg-panel2 text-ink";
  const dot = tone ? DOT[tone] : "bg-muted";
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-3.5 flex items-center gap-2.5 text-base font-semibold tracking-tight">
        <span className={`grid size-8 place-items-center rounded-lg ${badge}`}>
          {icon}
        </span>
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="space-y-2 text-sm leading-relaxed text-ink/90">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2.5">
              <span
                aria-hidden
                className={`mt-2 size-1.5 shrink-0 rounded-full ${dot}`}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function EditField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-ink/80">
        {label}
      </span>
      <input
        type="number"
        min={0}
        className="control"
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          onChange(
            e.target.value === "" || !Number.isFinite(v) ? 0 : Math.max(0, v),
          );
        }}
      />
    </label>
  );
}
