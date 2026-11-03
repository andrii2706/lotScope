"use client";


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
      <span className="mb-1.5 block text-[13px] font-medium text-ink">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex min-h-10 gap-1 rounded-[10px] bg-panel2 p-1"
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
              className={`flex-1 rounded-[7px] px-2 py-1.5 text-[13px] font-medium leading-tight transition ${
                active
                  ? "bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(16,24,40,0.08)] ring-1 ring-line"
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
