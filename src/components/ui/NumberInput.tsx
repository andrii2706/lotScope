"use client";


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
        className={`control ${suffix ? "pr-12" : ""} ${large ? "!min-h-12 !text-lg !font-semibold" : ""}`}
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
