"use client";

import { useId, useMemo, useRef, useState } from "react";
import { suggest } from "@/lib/shared/cars";

export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  required,
  minChars = 2,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  minChars?: number;
  label?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const items = useMemo(() => {
    if (minChars >= 2) return suggest(options, value);
    const q = value.trim().toLowerCase();
    if (q.length < minChars) return [];
    return options.filter((o) => o.toLowerCase() !== q && o.toLowerCase().includes(q));
  }, [options, value, minChars]);
  const visible = open && items.length > 0;

  function pick(item: string) {
    onChange(item);
    setOpen(false);
    setActive(-1);
  }

  return (
    <div className="relative">
      <input
        className="control"
        placeholder={placeholder}
        value={value}
        required={required}
        role="combobox"
        aria-expanded={visible}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-label={label}
        aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => {
          if (closeTimer.current) clearTimeout(closeTimer.current);
          setOpen(true);
        }}
        onBlur={() => {
          closeTimer.current = setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && items.length) {
            e.preventDefault();
            setOpen(true);
            setActive((a) => (a + 1) % items.length);
          } else if (e.key === "ArrowUp" && items.length) {
            e.preventDefault();
            setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
          } else if (e.key === "Enter" && visible && active >= 0) {
            e.preventDefault();
            pick(items[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {visible && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-64 overflow-auto rounded-xl border border-line2 bg-surface p-1 shadow-[var(--pop-shadow)]"
        >
          {items.map((item, i) => (
            <li
              key={item}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(item);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer rounded-lg px-3 py-2 text-sm ${i === active ? "bg-panel2 text-ink" : "text-ink"}`}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
