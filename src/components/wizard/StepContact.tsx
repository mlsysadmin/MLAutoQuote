"use client";

import { Checkbox, Field, Input, Select } from "@/components/ui";
import { PROVINCES } from "@/lib/vehicles";
import { ID_TYPE_OPTIONS } from "@/lib/id-types";
import { StepHeading, Panel, PanelTitle, type StepProps } from "./StepShell";

/** The latest date of birth that still makes someone 18 today. */
function maxBirthDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
}

export function StepContact({ draft, set, errors }: StepProps) {
  return (
    <>
      <StepHeading
        title="About you"
        description="We text your offer to this number. Your ID details go on your customer record — the same record we use if you ever sell us another vehicle."
      />

      <Panel className="space-y-5">
        <PanelTitle>Your details</PanelTitle>

        <Field
          label="Full name"
          required
          error={errors.customerName}
          hint="As printed on your ID."
        >
          {({ id, invalid }) => (
            <Input
              id={id}
              invalid={invalid}
              value={draft.customerName}
              autoComplete="name"
              placeholder="Juan Dela Cruz"
              onChange={(e) => set("customerName", e.target.value)}
            />
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Mobile number"
            required
            error={errors.customerPhone}
            hint="This is where your offer link arrives."
          >
            {({ id, invalid }) => (
              <Input
                id={id}
                invalid={invalid}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={draft.customerPhone}
                placeholder="0917 123 4567"
                className="nums"
                onChange={(e) => set("customerPhone", e.target.value)}
              />
            )}
          </Field>

          <Field
            label="Date of birth"
            required
            error={errors.birthDate}
            hint="You must be 18 or over to sell a vehicle."
          >
            {({ id, invalid }) => (
              <Input
                id={id}
                invalid={invalid}
                type="date"
                max={maxBirthDate()}
                value={draft.birthDate}
                onChange={(e) => set("birthDate", e.target.value)}
              />
            )}
          </Field>
        </div>

        <Field
          label="Email"
          error={errors.customerEmail}
          hint="For a copy of your offer."
        >
          {({ id, invalid }) => (
            <Input
              id={id}
              invalid={invalid}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={draft.customerEmail}
              placeholder="juan@example.com"
              onChange={(e) => set("customerEmail", e.target.value)}
            />
          )}
        </Field>
      </Panel>

      <Panel className="mt-5 space-y-5">
        <PanelTitle>Your ID</PanelTitle>
        <p className="-mt-2 text-sm leading-relaxed text-ink-600">
          Any current government ID. Bring the original when you come to the
          branch — we only need the details here.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="ID type" required error={errors.idType}>
            {({ id, invalid }) => (
              <Select
                id={id}
                invalid={invalid}
                value={draft.idType}
                onChange={(e) => set("idType", e.target.value)}
              >
                <option value="">Choose an ID…</option>
                {ID_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            label="ID number"
            required
            error={errors.idNumber}
            hint="Exactly as printed, including any dashes."
          >
            {({ id, invalid }) => (
              <Input
                id={id}
                invalid={invalid}
                value={draft.idNumber}
                autoComplete="off"
                spellCheck={false}
                placeholder="N01-23-456789"
                className="font-mono tracking-wide"
                onChange={(e) => set("idNumber", e.target.value.toUpperCase())}
              />
            )}
          </Field>
        </div>
      </Panel>

      <Panel className="mt-5 space-y-5">
        <PanelTitle>Address</PanelTitle>

        <Field label="House number and street" error={errors.addressLine}>
          {({ id }) => (
            <Input
              id={id}
              value={draft.addressLine}
              autoComplete="address-line1"
              placeholder="123 Mango Avenue"
              onChange={(e) => set("addressLine", e.target.value)}
            />
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Barangay">
            {({ id }) => (
              <Input
                id={id}
                value={draft.barangay}
                placeholder="Barangay Luz"
                onChange={(e) => set("barangay", e.target.value)}
              />
            )}
          </Field>

          <Field label="City / municipality">
            {({ id }) => (
              <Input
                id={id}
                value={draft.city}
                autoComplete="address-level2"
                placeholder="Cebu City"
                onChange={(e) => set("city", e.target.value)}
              />
            )}
          </Field>

          <Field label="Province">
            {({ id }) => (
              <Select
                id={id}
                value={draft.province}
                onChange={(e) => set("province", e.target.value)}
              >
                <option value="">Choose…</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field
          label="Preferred M Lhuillier branch"
          hint="Where you'd rather complete the sale, if you have one in mind."
        >
          {({ id }) => (
            <Input
              id={id}
              value={draft.preferredBranch}
              placeholder="e.g. ML Colon, Cebu City"
              onChange={(e) => set("preferredBranch", e.target.value)}
            />
          )}
        </Field>
      </Panel>

      <div className="mt-5 rounded-2xl bg-white p-5 ring-1 ring-ink-200/70 sm:p-6">
        <Checkbox
          checked={draft.consentGiven}
          onChange={(v) => set("consentGiven", v)}
          label="I confirm the details above are accurate"
          description="And I agree that M Lhuillier may keep and process the information, ID details and photos I've submitted for the purpose of appraising this vehicle and maintaining my customer record, in line with the Data Privacy Act."
        />
        {errors.consentGiven ? (
          <p role="alert" className="mt-2 text-xs font-medium text-ml-red-700">
            {errors.consentGiven}
          </p>
        ) : null}
      </div>
    </>
  );
}
