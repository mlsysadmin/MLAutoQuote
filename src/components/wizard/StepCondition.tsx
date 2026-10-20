"use client";

import { ChoiceGrid, Field, Textarea, YesNo } from "@/components/ui";
import { CONDITION_GRADES } from "@/lib/wizard";
import { StepHeading, Panel, PanelTitle, type StepProps } from "./StepShell";

export function StepCondition({ draft, set, errors }: StepProps) {
  return (
    <>
      <StepHeading
        title="How is it holding up?"
        description="Answer honestly — our appraiser sees the photos anyway, and a surprise at inspection costs everyone a trip."
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
          <p role="alert" className="mt-2 text-xs font-medium text-ml-red-700">
            {errors.conditionGrade}
          </p>
        ) : null}
      </Panel>

      <Panel className="mt-5 space-y-6">
        <PanelTitle>History</PanelTitle>

        <Question
          label="Has it been in an accident that needed body repair?"
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
          label="Has it ever been submerged in a flood?"
          hint="Including water reaching the floor of the cabin."
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

      <Panel className="mt-5 space-y-6">
        <PanelTitle>Right now</PanelTitle>

        <Question label="Any warning lights on the dashboard?">
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

        <div>
          <p className="text-sm font-medium text-ink-800">
            How much tread is left on the tires?
          </p>
          <p className="mt-1 text-xs text-ink-500">
            A rough guess is fine. Drag to adjust.
          </p>
          <TireSlider
            value={draft.tireConditionPct}
            onChange={(v) => set("tireConditionPct", v)}
          />
        </div>
      </Panel>

      <Panel className="mt-5">
        <Field
          label="Anything else we should know?"
          hint="Repairs due, parts replaced, noises, aftermarket work — it all helps."
        >
          {({ id }) => (
            <Textarea
              id={id}
              rows={4}
              maxLength={2000}
              value={draft.issuesNotes}
              placeholder="e.g. Timing belt replaced last year. Small dent on the rear left door."
              onChange={(e) => set("issuesNotes", e.target.value)}
            />
          )}
        </Field>
      </Panel>
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
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-ink-800">{label}</p>
      {hint ? <p className="mt-1 text-xs text-ink-500">{hint}</p> : null}
      <div className="mt-2.5">{children}</div>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-ml-red-700">
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
    <div className="mt-3">
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
        className="mt-2 w-full accent-ml-red-600"
      />
      <div className="mt-1 flex justify-between text-[0.7rem] text-ink-400">
        <span>Bald</span>
        <span>Half</span>
        <span>New</span>
      </div>
    </div>
  );
}
