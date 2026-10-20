"use client";

import { ChoiceGrid, Field, Input, Select } from "@/components/ui";
import { formatKm } from "@/lib/money";
import { EXPECTED_KM_PER_YEAR } from "@/lib/vehicles";
import { FUEL_TYPES, TRANSMISSIONS } from "@/lib/wizard";
import { StepHeading, Panel, PanelTitle, type StepProps } from "./StepShell";

const BODY_TYPES = [
  { value: "SEDAN", label: "Sedan" },
  { value: "HATCHBACK", label: "Hatchback" },
  { value: "SUV", label: "SUV" },
  { value: "CROSSOVER", label: "Crossover" },
  { value: "MPV", label: "MPV" },
  { value: "PICKUP", label: "Pickup" },
  { value: "VAN", label: "Van" },
  { value: "COUPE", label: "Coupe" },
];

export function StepSpecs({ draft, set, errors }: StepProps) {
  const age = draft.year ? Math.max(0, new Date().getFullYear() - draft.year) : null;
  const expected = age !== null ? age * EXPECTED_KM_PER_YEAR : null;

  return (
    <>
      <StepHeading
        title="Tell us a bit more"
        description="The transmission and mileage move the price more than anything else on this page."
      />

      <Panel>
        <PanelTitle>Drivetrain</PanelTitle>

        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium text-ink-800">
              Transmission <span className="text-ml-red-600">*</span>
            </p>
            <ChoiceGrid
              label="Transmission"
              columns={4}
              options={TRANSMISSIONS}
              value={draft.transmission || null}
              onChange={(v) => set("transmission", v)}
            />
            {errors.transmission ? (
              <p role="alert" className="mt-1.5 text-xs font-medium text-ml-red-700">
                {errors.transmission}
              </p>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-ink-800">
              Fuel <span className="text-ml-red-600">*</span>
            </p>
            <ChoiceGrid
              label="Fuel type"
              columns={3}
              options={FUEL_TYPES}
              value={draft.fuelType || null}
              onChange={(v) => set("fuelType", v)}
            />
            {errors.fuelType ? (
              <p role="alert" className="mt-1.5 text-xs font-medium text-ml-red-700">
                {errors.fuelType}
              </p>
            ) : null}
          </div>
        </div>
      </Panel>

      <Panel className="mt-5">
        <PanelTitle>Odometer</PanelTitle>

        <Field
          label="Current mileage"
          error={errors.mileageKm}
          required
          hint={
            expected !== null
              ? `A ${age}-year-old unit typically reads around ${formatKm(expected)}.`
              : "Read it straight off the dashboard."
          }
        >
          {({ id, invalid }) => (
            <div className="relative">
              <Input
                id={id}
                invalid={invalid}
                inputMode="numeric"
                value={draft.mileageKm ?? ""}
                placeholder="85000"
                className="nums pr-12"
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^0-9]/g, "");
                  set("mileageKm", digits ? Number(digits) : null);
                }}
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-500">
                km
              </span>
            </div>
          )}
        </Field>

        {draft.mileageKm !== null && expected !== null && expected > 0 ? (
          <MileageGauge actual={draft.mileageKm} expected={expected} />
        ) : null}
      </Panel>

      <Panel className="mt-5 space-y-5">
        <PanelTitle>Optional details</PanelTitle>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Variant / trim" hint="e.g. 1.5 G CVT, 4x2 LS">
            {({ id }) => (
              <Input
                id={id}
                value={draft.variant}
                placeholder="1.5 G CVT"
                onChange={(e) => set("variant", e.target.value)}
              />
            )}
          </Field>

          <Field label="Colour">
            {({ id }) => (
              <Input
                id={id}
                value={draft.colour}
                placeholder="Pearl white"
                onChange={(e) => set("colour", e.target.value)}
              />
            )}
          </Field>
        </div>

        <Field label="Body type">
          {({ id }) => (
            <Select
              id={id}
              value={draft.bodyType}
              onChange={(e) => set("bodyType", e.target.value)}
            >
              <option value="">Choose…</option>
              {BODY_TYPES.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </Panel>
    </>
  );
}

/**
 * Shows where this odometer sits against the age-typical reading. Customers
 * with a low-mileage unit are reassured, and those above it aren't surprised
 * later by a mileage line on the offer.
 */
function MileageGauge({
  actual,
  expected,
}: {
  actual: number;
  expected: number;
}) {
  const ratio = actual / expected;
  const position = Math.min(100, Math.max(0, (ratio / 2) * 100));

  const verdict =
    ratio < 0.75
      ? { label: "Below average for its age", tone: "text-[var(--color-ok)]" }
      : ratio <= 1.25
        ? { label: "About average for its age", tone: "text-ink-600" }
        : { label: "Above average for its age", tone: "text-[var(--color-warn)]" };

  return (
    <div className="mt-5 rounded-xl bg-ink-50 px-4 py-3.5">
      <div className="flex items-baseline justify-between">
        <p className={`text-sm font-semibold ${verdict.tone}`}>{verdict.label}</p>
        <p className="text-xs text-ink-500 nums">
          {Math.round(ratio * 100)}% of typical
        </p>
      </div>
      <div className="relative mt-3 h-2 rounded-full bg-ink-200">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-[37.5%] w-[25%] rounded-full bg-ink-300"
        />
        <div
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ml-red-600 ring-2 ring-white transition-[left] duration-300"
          style={{ left: `${position}%` }}
        />
      </div>
    </div>
  );
}
