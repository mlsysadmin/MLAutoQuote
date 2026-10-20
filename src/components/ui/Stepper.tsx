"use client";

/**
 * Wizard progress.
 *
 * On a phone the seven step names don't fit, so it collapses to a bar plus
 * "Step 3 of 7 · Condition" — the customer still knows where they are and how
 * much is left, which is the only job this has.
 */
export function Stepper({
  steps,
  current,
  onJump,
  furthest,
}: {
  steps: string[];
  current: number;
  /** How far the customer has legitimately reached — later steps stay locked. */
  furthest: number;
  onJump?: (step: number) => void;
}) {
  const pct = Math.round(((current - 1) / (steps.length - 1)) * 100);

  return (
    <div>
      {/* Mobile */}
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-ink-900">
            {steps[current - 1]}
          </p>
          <p className="text-xs font-medium text-ink-500 nums">
            {current} / {steps.length}
          </p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-200">
          <div
            className="h-full rounded-full bg-ml-red-600 transition-[width] duration-400 ease-out"
            style={{ width: `${Math.max(pct, 4)}%` }}
          />
        </div>
      </div>

      {/* Desktop */}
      <ol className="hidden items-center gap-1 sm:flex">
        {steps.map((label, i) => {
          const step = i + 1;
          const done = step < current;
          const active = step === current;
          const reachable = step <= furthest;

          return (
            <li key={label} className="flex min-w-0 flex-1 items-center gap-1">
              <button
                type="button"
                disabled={!reachable || !onJump}
                onClick={() => onJump?.(step)}
                aria-current={active ? "step" : undefined}
                className={`group flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                  reachable && onJump ? "hover:bg-ink-100" : "cursor-default"
                }`}
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    done
                      ? "bg-ml-red-600 text-white"
                      : active
                        ? "bg-ink-900 text-white ring-4 ring-ml-red-100"
                        : "bg-ink-200 text-ink-600"
                  }`}
                >
                  {done ? (
                    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
                      <path
                        d="m3.5 8.5 3 3 6-7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    step
                  )}
                </span>
                <span
                  className={`truncate text-xs font-semibold ${
                    active ? "text-ink-900" : done ? "text-ink-600" : "text-ink-400"
                  }`}
                >
                  {label}
                </span>
              </button>
              {i < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={`h-px w-4 shrink-0 ${done ? "bg-ml-red-300" : "bg-ink-200"}`}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
