"use client";

import { useId, useState } from "react";

/**
 * Charts for the trends dashboard.
 *
 * Every chart here shows one series, so each uses a single hue rather than a
 * colour per bar — colour would otherwise be encoding rank, which it must not.
 * Values are labelled directly, so nothing depends on reading a colour, and
 * each chart carries a table view underneath for screen readers and for anyone
 * who wants the numbers rather than the shape.
 */

/** Single-series mark colour. Contrast against the card surface is 5.9:1. */
const MARK = "#C8120C";
/** Second series, only where a chart genuinely has two. Validated CVD-safe. */
export const SERIES = ["#2563EB", "#D97706"] as const;

export type Datum = { label: string; value: number; href?: string };

function pct(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

/**
 * Horizontal bars for a ranked category list — makes, body types, provinces.
 * Horizontal because category names are words, and words want horizontal room.
 */
export function BarList({
  data,
  total,
  unit = "submissions",
  emptyLabel = "Nothing to show yet",
}: {
  data: Datum[];
  total?: number;
  unit?: string;
  emptyLabel?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const sum = total ?? data.reduce((s, d) => s + d.value, 0);
  const max = Math.max(1, ...data.map((d) => d.value));

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-500">{emptyLabel}</p>;
  }

  return (
    <div>
      <ul className="space-y-2.5">
        {data.map((d) => {
          const active = hover === d.label;
          return (
            <li
              key={d.label}
              onMouseEnter={() => setHover(d.label)}
              onMouseLeave={() => setHover(null)}
              className="group"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-medium text-ink-800">
                  {d.label}
                </span>
                <span className="shrink-0 text-sm font-bold text-ink-900 nums">
                  {d.value}
                  <span className="ml-1.5 font-normal text-ink-500">
                    {pct(d.value, sum)}
                  </span>
                </span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full transition-[width,opacity] duration-300"
                  style={{
                    width: `${Math.max((d.value / max) * 100, 2)}%`,
                    background: MARK,
                    opacity: hover && !active ? 0.45 : 1,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <TableView data={data} total={sum} unit={unit} />
    </div>
  );
}

/**
 * Columns across an ordered axis — model years. Ordered left to right because
 * the axis is time, and the eye reads a distribution better horizontally.
 */
export function ColumnChart({
  data,
  unit = "submissions",
  height = 180,
}: {
  data: Datum[];
  unit?: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const titleId = useId();

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-500">
        Nothing to show yet
      </p>
    );
  }

  const max = Math.max(1, ...data.map((d) => d.value));
  const sum = data.reduce((s, d) => s + d.value, 0);
  // Label every year when there's room, otherwise every other one.
  const labelEvery = data.length > 14 ? 2 : 1;

  return (
    <div>
      <div
        className="relative flex items-end gap-[2px]"
        style={{ height }}
        role="img"
        aria-labelledby={titleId}
      >
        <span id={titleId} className="sr-only">
          {unit} by model year, {data[0].label} to {data[data.length - 1].label}
        </span>

        {data.map((d, i) => {
          const active = hover === i;
          return (
            <div
              key={d.label}
              className="relative flex min-w-0 flex-1 flex-col justify-end"
              style={{ height }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {active ? (
                <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg">
                  {d.label}: {d.value} {unit}
                </div>
              ) : null}
              <div
                className="rounded-t-[4px] transition-[height,opacity] duration-300"
                style={{
                  height: `${Math.max((d.value / max) * (height - 28), 3)}px`,
                  background: MARK,
                  opacity: hover !== null && !active ? 0.45 : 1,
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-1.5 flex gap-[2px]">
        {data.map((d, i) => (
          <span
            key={d.label}
            className="min-w-0 flex-1 text-center text-[0.65rem] text-ink-500 nums"
          >
            {i % labelEvery === 0 ? d.label : ""}
          </span>
        ))}
      </div>

      <TableView data={data} total={sum} unit={unit} />
    </div>
  );
}

/** A single headline figure — no plot, so no hover layer. */
export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "accent";
}) {
  return (
    <div
      className={`rounded-2xl p-5 ring-1 ${
        tone === "accent"
          ? "bg-ink-900 text-white ring-ink-900"
          : "bg-white ring-ink-200/70"
      }`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-wider ${
          tone === "accent" ? "text-white/60" : "text-ink-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1.5 text-3xl font-extrabold nums ${
          tone === "accent" ? "text-white" : "text-ink-950"
        }`}
      >
        {value}
      </p>
      {hint ? (
        <p
          className={`mt-1 text-xs ${
            tone === "accent" ? "text-white/60" : "text-ink-500"
          }`}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function TableView({
  data,
  total,
  unit,
}: {
  data: Datum[];
  total: number;
  unit: string;
}) {
  return (
    <details className="mt-4 border-t border-ink-100 pt-3">
      <summary className="cursor-pointer text-xs font-semibold text-ink-500 hover:text-ink-800">
        View as table
      </summary>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left">
            <th scope="col" className="pb-1.5 text-xs font-bold uppercase tracking-wider text-ink-500">
              Category
            </th>
            <th scope="col" className="pb-1.5 text-right text-xs font-bold uppercase tracking-wider text-ink-500">
              {unit}
            </th>
            <th scope="col" className="pb-1.5 text-right text-xs font-bold uppercase tracking-wider text-ink-500">
              Share
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {data.map((d) => (
            <tr key={d.label}>
              <td className="py-1.5 text-ink-800">{d.label}</td>
              <td className="py-1.5 text-right font-medium text-ink-900 nums">
                {d.value}
              </td>
              <td className="py-1.5 text-right text-ink-600 nums">
                {pct(d.value, total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
