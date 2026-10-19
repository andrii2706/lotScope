"use client";

import { usd, type CostResult } from "@/lib/calc";
import type { CostOverrides } from "@/lib/types";

const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"];

export function CostBar({ cost, compact }: { cost: CostResult; compact?: boolean }) {
  const total = cost.groups.reduce((sum, g) => sum + g.subtotal, 0);
  if (total <= 0) return null;
  return (
    <figure className="avoid-break">
      <div className="flex h-3.5 w-full gap-0.5" role="img" aria-label="Структура ціни під ключ">
        {cost.groups.map((group, i) => {
          const share = (group.subtotal / total) * 100;
          if (share <= 0) return null;
          return (
            <div
              key={group.title}
              tabIndex={0}
              className="group relative h-full min-w-1 first:rounded-l-[4px] last:rounded-r-[4px]"
              style={{ width: `${share}%`, background: SERIES[i] }}
            >
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs font-bold text-on-ink shadow-pop group-hover:block group-focus-visible:block">
                {group.title}: {usd(group.subtotal)} · {share.toFixed(0)} %
              </span>
            </div>
          );
        })}
      </div>
      <figcaption className={`mt-4 grid grid-cols-2 gap-x-4 gap-y-3 ${compact ? "" : "sm:grid-cols-4"}`}>
        {cost.groups.map((group, i) => (
          <div key={group.title} className="flex items-start gap-2">
            <span aria-hidden className="mt-1 size-2.5 shrink-0 rounded-[3px]" style={{ background: SERIES[i] }} />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-muted">{group.title}</span>
              <span className="block text-sm font-extrabold">
                {usd(group.subtotal)}
                <span className="ml-1.5 text-xs font-semibold text-faint">
                  {((group.subtotal / total) * 100).toFixed(0)} %
                </span>
              </span>
            </span>
          </div>
        ))}
      </figcaption>
    </figure>
  );
}

export function CostTable({
  cost,
  editing,
  overrides,
  onOverride,
}: {
  cost: CostResult;
  editing: boolean;
  overrides: CostOverrides;
  onOverride: (key: keyof CostOverrides, value: number | undefined) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line print:rounded-xl">
      <table className="w-full text-sm">
        <tbody>
          {cost.groups.map((group, i) => (
            <GroupRows
              key={group.title}
              group={group}
              color={SERIES[i]}
              editing={editing}
              overrides={overrides}
              onOverride={onOverride}
            />
          ))}
          <tr className="bg-panel2">
            <th scope="row" className="px-4 py-3.5 text-left text-[15px] font-extrabold">
              Разом під ключ
              <span className="block text-xs font-medium text-muted">з урахуванням вилки ремонту</span>
            </th>
            <td className="whitespace-nowrap px-4 py-3.5 text-right text-[15px] font-extrabold">
              {usd(cost.totalMinUsd)} – {usd(cost.totalMaxUsd)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function GroupRows({
  group,
  color,
  editing,
  overrides,
  onOverride,
}: {
  group: CostResult["groups"][number];
  color: string;
  editing: boolean;
  overrides: CostOverrides;
  onOverride: (key: keyof CostOverrides, value: number | undefined) => void;
}) {
  return (
    <>
      <tr className="border-b border-line bg-panel2/60">
        <th scope="colgroup" className="px-4 py-2.5 text-left text-xs font-extrabold uppercase tracking-wider text-ink/70">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: color }} />
            {group.title}
          </span>
        </th>
        <td className="px-4 py-2.5 text-right text-xs font-extrabold text-ink/70">{usd(group.subtotal)}</td>
      </tr>
      {group.lines.map((line) => {
        const key = line.editable;
        const changed = key !== undefined && overrides[key] !== undefined;
        return (
          <tr key={line.key} className="border-b border-line last:border-b-0">
            <td className="px-4 py-2.5">
              <span className="font-semibold">{line.label}</span>
              {line.hint && <span className="block text-xs text-muted">{line.hint}</span>}
            </td>
            <td className="whitespace-nowrap px-4 py-2.5 text-right font-bold">
              {editing && key ? (
                <span className="no-print inline-flex items-center gap-2">
                  {changed && (
                    <button
                      type="button"
                      className="text-xs font-bold text-accent-text underline-offset-2 hover:underline"
                      onClick={() => onOverride(key, undefined)}
                    >
                      скинути
                    </button>
                  )}
                  <input
                    type="number"
                    min={0}
                    aria-label={line.label}
                    className="control !min-h-9 w-28 !py-1 text-right"
                    value={line.usd}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      onOverride(key, e.target.value === "" || !Number.isFinite(v) ? 0 : Math.max(0, v));
                    }}
                  />
                </span>
              ) : null}
              <span className={editing && key ? "hidden print:inline" : ""}>{usd(line.usd)}</span>
            </td>
          </tr>
        );
      })}
    </>
  );
}
