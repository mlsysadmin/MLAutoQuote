"use client";

import { useMemo } from "react";
import { Field, Input, Select } from "@/components/ui";
import {
  CATALOG_FROM_YEAR,
  MAKES_BY_REGION,
  findSpec,
  modelsFor,
} from "@/lib/vehicles";
import { StepHeading, Panel, type StepProps } from "./StepShell";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from(
  { length: CURRENT_YEAR + 1 - CATALOG_FROM_YEAR + 1 },
  (_, i) => CURRENT_YEAR + 1 - i,
);

export function StepVehicle({ draft, set, errors }: StepProps) {
  // The model list depends on the year: a 2004 Toyota can't be a Raize, and a
  // 2023 one can't be a Revo. Asking for the year first keeps the list honest.
  const models = useMemo(
    () => modelsFor(draft.make, draft.year),
    [draft.make, draft.year],
  );

  /** Drops a model the new make or year no longer offers. */
  function clearModelIfStale(make: string, year: number | null) {
    if (!draft.model) return;
    const stillOffered = modelsFor(make, year).some(
      (m) => m.name === draft.model,
    );
    if (!stillOffered) {
      set("model", "");
      set("bodyType", "");
    }
  }

  return (
    <>
      <StepHeading
        title="What are you selling?"
        description="Start with the basics. You can change any of this later — nothing is final until you submit."
      />

      <Panel className="space-y-5">
        <Field
          label="Make"
          error={errors.make}
          required
          hint="The brand, as printed on your CR."
        >
          {({ id, invalid }) => (
            <Select
              id={id}
              invalid={invalid}
              value={draft.make}
              onChange={(e) => {
                const make = e.target.value;
                set("make", make);
                clearModelIfStale(make, draft.year);
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
          <Field
            label="Model year"
            error={errors.year}
            required
            hint="The year on the CR, not the year you bought it."
          >
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
                <option value="">Choose a year…</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            label="Model"
            error={errors.model}
            required
            hint={
              draft.make && draft.year
                ? `Models sold in ${draft.year}.`
                : undefined
            }
          >
            {({ id, invalid }) => (
              <Select
                id={id}
                invalid={invalid}
                value={draft.model}
                disabled={!draft.make}
                onChange={(e) => {
                  const name = e.target.value;
                  set("model", name);
                  const spec = findSpec(draft.make, name);
                  set("bodyType", spec ? spec.body : "");
                }}
              >
                <option value="">
                  {draft.make ? "Choose a model…" : "Pick a make first"}
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
          <p className="rounded-xl bg-ml-gold-50 px-4 py-3 text-xs leading-relaxed text-ml-gold-800">
            We don&apos;t have {draft.make} models listed for {draft.year}.
            Choose <strong>Other / not listed</strong> and our appraiser will
            identify it from your photos and papers.
          </p>
        ) : null}
      </Panel>

      <Panel className="mt-5 space-y-5">
        <p className="text-sm text-ink-600">
          These help us match your unit to the right listings. Skip them if you
          don&apos;t have the papers to hand.
        </p>

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
                onChange={(e) =>
                  set("plateNumber", e.target.value.toUpperCase())
                }
              />
            )}
          </Field>

          <Field
            label="VIN / chassis number"
            error={errors.vin}
            hint="17 characters, on the CR or the driver-side door frame."
          >
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
        </div>
      </Panel>
    </>
  );
}
