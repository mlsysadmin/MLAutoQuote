"use client";

import { useMemo } from "react";
import { ChoiceGrid, Field, Input, Select } from "@/components/ui";
import { formatKm } from "@/lib/money";
import {
  CATALOG_FROM_YEAR,
  EXPECTED_KM_PER_YEAR,
  MAKES_BY_REGION,
  findSpec,
  modelsFor,
} from "@/lib/vehicles";
import { FUEL_TYPES, TRANSMISSIONS } from "@/lib/wizard";
import { StepHeading, Panel, PanelTitle, type StepProps } from "./StepShell";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from(
  { length: CURRENT_YEAR + 1 - CATALOG_FROM_YEAR + 1 },
  (_, i) => CURRENT_YEAR + 1 - i,
);

/**
 * Everything about the vehicle, in one step.
 *
 * Make, year and model first because the model list depends on the year, then
 * the three facts that actually move the price. Plate, VIN, trim and colour sit
 * behind a disclosure — useful to the appraiser, never worth a tap from
 * someone standing in a car park.
 */
export function StepCar({ draft, set, errors }: StepProps) {
  const models = useMemo(
    () => modelsFor(draft.make, draft.year),
    [draft.make, draft.year],
  );

  const age = draft.year ? Math.max(0, CURRENT_YEAR - draft.year) : null;
  const expected = age !== null ? age * EXPECTED_KM_PER_YEAR : null;

  function clearModelIfStale(make: string, year: number | null) {
    if (!draft.model) return;
    if (!modelsFor(make, year).some((m) => m.name === draft.model)) {
      set("model", "");
      set("bodyType", "");
    }
  }

  return (
    <>
      <StepHeading
        title="What are you selling?"
        description="Six quick answers. Nothing is final until you submit."
      />

      <Panel className="space-y-5">
        <Field label="Make" error={errors.make} required>
          {({ id, invalid }) => (
            <Select
              id={id}
              invalid={invalid}
              value={draft.make}
              onChange={(e) => {
                set("make", e.target.value);
                clearModelIfStale(e.target.value, draft.year);
              }}
            >
              <option value="">Choose a make…</option>
              {MAKES_BY_REGION.map((group) =>
                group.makes.length === 0 ? null : (
                  <optgroup key={group.region} label={group.region}>
                    {group.makes.map((make) => (
                      <option key={make} value={make}>
                        {make}
                      </option>
                    ))}
                  </optgroup>
                ),
              )}
            </Select>
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Year" error={errors.year} required>
            {({ id, invalid }) => (
              <Select
                id={id}
                invalid={invalid}
                value={draft.year ?? ""}
                onChange={(e) => {
                  const year = e.target.value ? Number(e.target.value) : null;
                  set("year", year);
                  clearModelIfStale(draft.make, year);
                }}
              >
                <option value="">Choose…</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Model" error={errors.model} required>
            {({ id, invalid }) => (
              <Select
                id={id}
                invalid={invalid}
                value={draft.model}
                disabled={!draft.make}
                onChange={(e) => {
                  set("model", e.target.value);
                  const spec = findSpec(draft.make, e.target.value);
                  set("bodyType", spec ? spec.body : "");
                }}
              >
                <option value="">
                  {draft.make ? "Choose…" : "Pick a make first"}
                </option>
                {models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
                <option value="Other">Other / not listed</option>
              </Select>
            )}
          </Field>
        </div>

        {draft.make && draft.year && models.length === 0 ? (
          <p className="rounded-2xl bg-[var(--color-warn-bg)] px-4 py-3 text-xs leading-relaxed text-[var(--color-warn)]">
            No {draft.make} models listed for {draft.year}. Choose{" "}
            <strong>Other / not listed</strong> and our appraiser will identify
            it from your photos.
          </p>
        ) : null}
      </Panel>

      <Panel className="mt-4 space-y-6">
        <div>
          <p className="mb-2 text-sm font-semibold text-ink-900">
            Transmission <span className="text-ml-red-500">*</span>
          </p>
          <ChoiceGrid
            label="Transmission"
            columns={4}
            options={TRANSMISSIONS}
            value={draft.transmission || null}
            onChange={(v) => set("transmission", v)}
          />
          {errors.transmission ? (
            <p role="alert" className="mt-1.5 text-xs font-semibold text-ml-red-600">
              {errors.transmission}
            </p>
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-ink-900">
            Fuel <span className="text-ml-red-500">*</span>
          </p>
          <ChoiceGrid
            label="Fuel type"
            columns={3}
            options={FUEL_TYPES}
            value={draft.fuelType || null}
            onChange={(v) => set("fuelType", v)}
          />
          {errors.fuelType ? (
            <p role="alert" className="mt-1.5 text-xs font-semibold text-ml-red-600">
              {errors.fuelType}
            </p>
          ) : null}
        </div>

        <Field
          label="Mileage"
          error={errors.mileageKm}
          required
          hint={
            expected !== null && expected > 0
              ? `A ${age}-year-old unit usually reads around ${formatKm(expected)}.`
              : "Straight off the dashboard."
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
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-500">
                km
              </span>
            </div>
          )}
        </Field>

        {draft.mileageKm !== null && expected !== null && expected > 0 ? (
          <MileageGauge actual={draft.mileageKm} expected={expected} />
        ) : null}
      </Panel>

      <details className="group mt-4 overflow-hidden rounded-[20px] bg-white shadow-[0_4px_12px_rgb(0_0_0/0.08)]">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 sm:px-6">
          <span className="text-sm font-semibold text-ink-900">
            Add plate, VIN or trim
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

        <div className="space-y-5 border-t border-ink-200/70 px-5 py-5 sm:px-6">
          <PanelTitle>Helps us match the right listings</PanelTitle>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Plate number" error={errors.plateNumber}>
              {({ id, invalid }) => (
                <Input
                  id={id}
                  invalid={invalid}
                  value={draft.plateNumber}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="ABC 1234"
                  onChange={(e) => set("plateNumber", e.target.value.toUpperCase())}
                />
              )}
            </Field>

            <Field label="Trim / variant">
              {({ id }) => (
                <Input
                  id={id}
                  value={draft.variant}
                  placeholder="1.5 G CVT"
                  onChange={(e) => set("variant", e.target.value)}
                />
              )}
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="VIN / chassis number" error={errors.vin}>
              {({ id, invalid }) => (
                <Input
                  id={id}
                  invalid={invalid}
                  value={draft.vin}
                  maxLength={17}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="MR0FB22G1J1234567"
                  className="font-mono tracking-wide"
                  onChange={(e) => set("vin", e.target.value.toUpperCase())}
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
        </div>
      </details>
    </>
  );
}

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
        ? { label: "About average for its age", tone: "text-ink-700" }
        : { label: "Above average for its age", tone: "text-[var(--color-warn)]" };

  return (
    <div className="rounded-2xl bg-ink-100 px-4 py-3.5">
      <div className="flex items-baseline justify-between">
        <p className={`text-sm font-semibold ${verdict.tone}`}>{verdict.label}</p>
        <p className="text-xs text-ink-600 nums">
          {Math.round(ratio * 100)}% of typical
        </p>
      </div>
      <div className="relative mt-3 h-2 rounded-full bg-ink-300">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-[37.5%] w-[25%] rounded-full bg-ink-400"
        />
        <div
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ml-red-500 ring-2 ring-white transition-[left] duration-300"
          style={{ left: `${position}%` }}
        />
      </div>
    </div>
  );
}
