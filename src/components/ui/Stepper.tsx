"use client";

/**
 * Wizard progress.
 *
 * With four steps the full set of labels fits even on a narrow phone, so the
 * mobile view keeps them rather than collapsing to a bare bar — knowing that
 * "Photos" is next is worth more than the pixels it costs.
 */
export function Stepper({
  steps,
  current,
  furthest,
  completion,
  onJump,
}: {
  steps: string[];
  current: number;
  /** How far the customer has legitimately reached — later steps stay locked. */
  furthest: number;
  /** Which steps are actually finished, so ticks mean something. */
  completion?: Record<number, boolean>;
  onJump?: (step: number) => void;
}) {
  return (
    <ol className="flex items-center gap-1.5">
      {steps.map((label, i) => {
        const step = i + 1;
        const active = step === current;
        const done = completion?.[step] ?? step < current;
        const reachable = step <= furthest;

        return (
          <li key={label} className="flex min-w-0 flex-1 flex-col gap-1.5">
            <button
              type="button"
              disabled={!reachable || !onJump}
              onClick={() => onJump?.(step)}
              aria-current={active ? "step" : undefined}
              aria-label={`Step ${step}: ${label}${done ? " (done)" : ""}`}
              className="group flex w-full flex-col gap-1.5 text-left"
            >
              <span
                className={`h-1.5 w-full rounded-full transition-colors duration-300 ${
                  active
                    ? "bg-ml-red-500"
                    : done
                      ? "bg-ml-red-300"
                      : "bg-ink-200"
                }`}
              />
              <span className="flex items-center gap-1">
                {done && !active ? (
                  <svg
                    viewBox="0 0 16 16"
                    className="size-3 shrink-0 text-ml-red-600"
                    aria-hidden="true"
                  >
                    <path
                      d="m3.5 8.5 3 3 6-7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
                <span
                  className={`truncate text-[0.7rem] font-semibold sm:text-xs ${
                    active
                      ? "text-ink-900"
                      : done
                        ? "text-ink-600"
                        : "text-ink-400"
                  }`}
                >
                  {label}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
