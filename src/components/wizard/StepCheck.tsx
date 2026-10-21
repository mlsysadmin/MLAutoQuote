"use client";

import type { ReactNode } from "react";
import { Alert, ChoiceGrid, Field, PesoInput, Textarea, YesNo } from "@/components/ui";
import { formatPeso, parsePeso } from "@/lib/money";
import { CONDITION_GRADES } from "@/lib/wizard";
import { StepHeading, Panel, PanelTitle, type StepProps } from "./StepShell";

/**
 * Condition and paperwork in one step.
 *
 * Both are "tell us what we'll find anyway", and splitting them across two
 * screens bought nothing. Only the five answers that change the price are
 * required; the rest default sensibly and can be left alone.
 */
export function StepCheck({ draft, set, errors }: StepProps) {
  const missingPapers = draft.hasCR === false || draft.hasOR === false;

  return (
    <>
      <StepHeading
        title="How is it holding up?"
        description="Answer honestly — the appraiser sees the photos anyway, and a surprise at inspection costs everyone a trip."
      />

      <Panel>
        <PanelTitle>Overall condition</PanelTitle>
        <ChoiceGrid
          label="Overall condition"
          columns={1}
          options={CONDITION_GRADES}
          value={draft.conditionGrade || null}
          onChange={(v) => set("conditionGrade", v)}
        />
        {errors.conditionGrade ? (
          <p role="alert" className="mt-2 text-xs font-semibold text-ml-red-600">
            {errors.conditionGrade}
          </p>
        ) : null}
      </Panel>

      <Panel className="mt-4 space-y-6">
        <PanelTitle>History</PanelTitle>

        <Question
          label="Any accident that needed body repair?"
          hint="Minor bumper scuffs don't count."
          error={errors.hasAccidentHistory}
        >
          <YesNo
            name="Accident history"
            invert
            value={draft.hasAccidentHistory}
            onChange={(v) => set("hasAccidentHistory", v)}
          />
        </Question>

        <Question
          label="Has it ever been flooded?"
          hint="Including water reaching the cabin floor."
          error={errors.isFloodDamaged}
        >
          <YesNo
            name="Flood history"
            invert
            value={draft.isFloodDamaged}
            onChange={(v) => set("isFloodDamaged", v)}
          />
        </Question>
      </Panel>

      <Panel className="mt-4 space-y-6">
        <PanelTitle>Papers</PanelTitle>

        <Question
          label="Do you have the Certificate of Registration?"
          hint="The LTO document in your name."
          error={errors.hasCR}
        >
          <YesNo name="Has CR" value={draft.hasCR} onChange={(v) => set("hasCR", v)} />
        </Question>

        <Question
          label="Do you have the latest Official Receipt?"
          error={errors.hasOR}
        >
          <YesNo name="Has OR" value={draft.hasOR} onChange={(v) => set("hasOR", v)} />
        </Question>

        <Question
          label="Is the unit still being paid off?"
          hint="Bank or in-house financing with a balance left."
        >
          <YesNo
            name="Under financing"
            value={draft.isUnderFinancing}
            onChange={(v) => {
              set("isUnderFinancing", v);
              if (!v) set("financingBalance", null);
            }}
          />
        </Question>

        {draft.isUnderFinancing ? (
          <div className="animate-rise">
            <Field
              label="Remaining balance"
              required
              error={errors.financingBalance}
              hint="We settle this with your financing company and you keep the difference."
            >
              {({ id, invalid }) => (
                <PesoInput
                  id={id}
                  invalid={invalid}
                  value={
                    draft.financingBalance === null
                      ? ""
                      : draft.financingBalance.toLocaleString("en-PH")
                  }
                  placeholder="250,000"
                  onChange={(e) => set("financingBalance", parsePeso(e.target.value))}
                />
              )}
            </Field>
            {draft.financingBalance ? (
              <p className="mt-2 text-xs text-ink-600">
                We&apos;ll deduct {formatPeso(draft.financingBalance)} and pay off
                the loan for you.
              </p>
            ) : null}
          </div>
        ) : null}

        {missingPapers ? (
          <Alert tone="warn" title="That's workable">
            Missing papers can be re-issued. We&apos;ll include the cost and the
            steps in your offer so there are no surprises.
          </Alert>
        ) : null}
      </Panel>

      <details className="group mt-4 overflow-hidden rounded-[20px] bg-white shadow-[0_4px_12px_rgb(0_0_0/0.08)]">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 sm:px-6">
          <span className="text-sm font-semibold text-ink-900">
            Anything else we should know?
            <span className="ml-2 font-normal text-ink-500">optional</span>
          </span>
          <svg
            viewBox="0 0 20 20"
            className="size-4 text-ink-500 transition-transform group-open:rotate-180"
            aria-hidden="true"
          >
            <path
              d="m6 8 4 4 4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </summary>

        <div className="space-y-6 border-t border-ink-200/70 px-5 py-5 sm:px-6">
          <Question label="Warning lights on the dashboard?">
            <YesNo
              name="Warning lights"
              invert
              value={draft.hasWarningLights}
              onChange={(v) => set("hasWarningLights", v)}
            />
          </Question>

          <Question label="Is the air-conditioning cold?">
            <YesNo
              name="Aircon"
              value={draft.airconWorking}
              yesLabel="Yes, it's cold"
              noLabel="No / weak"
              onChange={(v) => set("airconWorking", v)}
            />
          </Question>

          <Question label="Mortgage annotated on the CR?" hint="Also called an encumbrance.">
            <YesNo
              name="Encumbered"
              invert
              value={draft.isEncumbered}
              onChange={(v) => set("isEncumbered", v)}
            />
          </Question>

          <div>
            <p className="text-sm font-semibold text-ink-900">Tire tread left</p>
            <TireSlider
              value={draft.tireConditionPct}
              onChange={(v) => set("tireConditionPct", v)}
            />
          </div>

          <Field label="Notes" hint="Repairs due, parts replaced, noises, aftermarket work.">
            {({ id }) => (
              <Textarea
                id={id}
                rows={3}
                maxLength={2000}
                value={draft.issuesNotes}
                placeholder="e.g. Timing belt replaced last year. Small dent on the rear left door."
                onChange={(e) => set("issuesNotes", e.target.value)}
              />
            )}
          </Field>
        </div>
      </details>
    </>
  );
}

function Question({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink-900">{label}</p>
      {hint ? <p className="mt-1 text-xs text-ink-600">{hint}</p> : null}
      <div className="mt-2.5">{children}</div>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-semibold text-ml-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function TireSlider({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (next: number) => void;
}) {
  const current = value ?? 70;
  const verdict =
    current < 30 ? "Needs replacing" : current < 55 ? "Worn" : "Plenty left";

  return (
    <div className="mt-2">
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-bold text-ink-900 nums">{current}%</span>
        <span className="text-xs font-semibold text-ink-600">{verdict}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={current}
        aria-label="Tire tread remaining"
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-ml-red-500"
      />
    </div>
  );
}
