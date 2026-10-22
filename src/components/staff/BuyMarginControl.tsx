"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@/components/ui";
import { formatPeso } from "@/lib/money";
import { roundToThousand } from "@/lib/money";

/**
 * The one number that sets what every offer opens at.
 *
 * It is shown as a percentage because that is how the business talks about it
 * ("we buy at eighty-two"), and it is paired with a worked example on a real
 * market mid, because a percentage on its own does not tell anybody what they
 * are about to do to the next thousand customers.
 *
 * Slider and number box edit the same value: the slider for feeling out the
 * range, the box for typing the figure someone has already decided on.
 */

/** The mid-market price the worked example is priced against. */
const EXAMPLE_MID = 412_000;

export function BuyMarginControl({
  initial,
  min,
  max,
  fromDatabase,
  updatedAt,
  updatedBy,
  envDefault,
}: {
  initial: number;
  min: number;
  max: number;
  fromDatabase: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  envDefault: number;
}) {
  const router = useRouter();
  const [pct, setPct] = useState(Math.round(initial * 1000) / 10);
  const [saved, setSaved] = useState(Math.round(initial * 1000) / 10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const dirty = Math.abs(pct - saved) > 0.0001;
  const example = roundToThousand(EXAMPLE_MID * (pct / 100));
  const savedExample = roundToThousand(EXAMPLE_MID * (saved / 100));

  async function save() {
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const res = await fetch("/api/staff/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyMargin: pct / 100 }),
      });
      const body = (await res.json()) as {
        buyMargin?: { value: number };
        error?: string;
        fields?: Record<string, string>;
      };

      if (!res.ok || !body.buyMargin) {
        setError(body.fields?.buyMargin ?? body.error ?? "That didn't save.");
        setBusy(false);
        return;
      }

      const next = Math.round(body.buyMargin.value * 1000) / 10;
      setPct(next);
      setSaved(next);
      setDone(true);
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Check your connection.");
    }
    setBusy(false);
  }

  return (
    <div className="rounded-[20px] bg-white p-5 shadow-[0_4px_12px_rgb(0_0_0/0.08)] sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-ink-900">Buy margin</h2>
        <span className="text-xs text-ink-500">
          {fromDatabase && updatedAt ? (
            <>
              Changed {new Date(updatedAt).toLocaleDateString("en-PH", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {updatedBy ? ` by ${updatedBy}` : ""}
            </>
          ) : (
            <>Never changed — using the deployment default</>
          )}
        </span>
      </div>

      <p className="mt-1 text-sm leading-relaxed text-ink-600">
        Every offer starts at this share of the mid-market price, before the
        adjustments for condition, mileage and papers. An appraiser can still
        move an individual offer; this sets where they all begin.
      </p>

      {error ? (
        <div className="mt-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}

      {/* ── The number ── */}
      <div className="mt-6 flex items-end gap-4">
        <label className="flex-1">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-500">
            Share of market mid
          </span>
          <div className="relative mt-2">
            <input
              type="number"
              min={min * 100}
              max={max * 100}
              step={0.5}
              value={pct}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n)) {
                  setPct(Math.min(max * 100, Math.max(min * 100, n)));
                  setDone(false);
                }
              }}
              className="w-full rounded-xl border border-ink-200 bg-white py-3 pl-4 pr-10 text-2xl font-extrabold text-ink-900 outline-none nums focus:border-ml-red-400 focus:ring-2 focus:ring-ml-red-100"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-ink-500">
              %
            </span>
          </div>
        </label>
      </div>

      {/* ── The slider ── */}
      <div className="mt-5">
        <input
          type="range"
          min={min * 100}
          max={max * 100}
          step={0.5}
          value={pct}
          onChange={(e) => {
            setPct(Number(e.target.value));
            setDone(false);
          }}
          aria-label="Buy margin, as a percentage of the mid-market price"
          className="w-full accent-[var(--color-ml-red-600)]"
        />
        <div className="mt-1 flex justify-between text-[0.7rem] font-semibold text-ink-400 nums">
          <span>{Math.round(min * 100)}%</span>
          <span>{Math.round(max * 100)}%</span>
        </div>
      </div>

      {/* ── What it means ── */}
      <div className="mt-6 rounded-2xl bg-ink-50 px-4 py-3.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
          On a {formatPeso(EXAMPLE_MID)} market mid
        </p>
        <p className="mt-1 flex flex-wrap items-baseline gap-2">
          <span className="text-2xl font-extrabold text-ink-900 nums">
            {formatPeso(example)}
          </span>
          {dirty ? (
            <span className="text-sm font-semibold text-ink-500 nums">
              was {formatPeso(savedExample)}
            </span>
          ) : null}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
          Before condition, mileage and paperwork adjustments. Existing offers
          keep the margin they were priced with — this applies to offers
          generated from now on.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={!dirty} loading={busy}>
          Save margin
        </Button>
        {dirty ? (
          <button
            type="button"
            onClick={() => {
              setPct(saved);
              setDone(false);
            }}
            className="text-sm font-semibold text-ink-600 hover:underline"
          >
            Cancel
          </button>
        ) : null}
        {done && !dirty ? (
          <span className="text-sm font-semibold text-[var(--color-ok)]">
            Saved.
          </span>
        ) : null}
      </div>

      {fromDatabase ? (
        <p className="mt-4 text-xs text-ink-500">
          The deployment default is {Math.round(envDefault * 1000) / 10}%. This
          setting overrides it.
        </p>
      ) : null}
    </div>
  );
}
