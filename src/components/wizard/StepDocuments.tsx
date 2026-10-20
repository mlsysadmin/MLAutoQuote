"use client";

import { Alert, Field, Input, PesoInput, Select, YesNo } from "@/components/ui";
import { parsePeso, formatPeso } from "@/lib/money";
import { StepHeading, Panel, PanelTitle, type StepProps } from "./StepShell";

const CURRENT_YEAR = new Date().getFullYear();
const REG_YEARS = Array.from({ length: 12 }, (_, i) => CURRENT_YEAR - i);

export function StepDocuments({ draft, set, errors }: StepProps) {
  const missingPapers = draft.hasCR === false || draft.hasOR === false;

  return (
    <>
      <StepHeading
        title="The paperwork"
        description="We can still make an offer with documents missing — we just need to know, so the number we send you is the number you actually get."
      />

      <Panel className="space-y-6">
        <PanelTitle>Registration</PanelTitle>

        <Question
          label="Do you have the Certificate of Registration (CR)?"
          hint="The green-and-white LTO document in your name."
          error={errors.hasCR}
        >
          <YesNo
            name="Has CR"
            value={draft.hasCR}
            onChange={(v) => set("hasCR", v)}
          />
        </Question>

        <Question
          label="Do you have the latest Official Receipt (OR)?"
          error={errors.hasOR}
        >
          <YesNo
            name="Has OR"
            value={draft.hasOR}
            onChange={(v) => set("hasOR", v)}
          />
        </Question>

        {draft.hasOR ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Last registered" hint="The year on your latest OR.">
              {({ id }) => (
                <Select
                  id={id}
                  value={draft.lastRegistrationYear ?? ""}
                  onChange={(e) =>
                    set(
                      "lastRegistrationYear",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                >
                  <option value="">Choose…</option>
                  {REG_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label="Registration expiry" hint="If you know it.">
              {({ id }) => (
                <Input
                  id={id}
                  type="date"
                  value={draft.orExpiryDate}
                  onChange={(e) => set("orExpiryDate", e.target.value)}
                />
              )}
            </Field>
          </div>
        ) : null}

        {missingPapers ? (
          <Alert tone="warn" title="That's workable">
            Missing papers can be re-issued. We&apos;ll include the cost and the
            steps in your offer so there are no surprises at the branch.
          </Alert>
        ) : null}
      </Panel>

      <Panel className="mt-5 space-y-6">
        <PanelTitle>Ownership</PanelTitle>

        <Question
          label="Is there a mortgage annotated on the CR?"
          hint="Also called an encumbrance. It appears printed on the CR itself."
        >
          <YesNo
            name="Encumbered"
            invert
            value={draft.isEncumbered}
            onChange={(v) => set("isEncumbered", v)}
          />
        </Question>

        <Question
          label="Is the unit still being paid off?"
          hint="Bank or in-house financing with a remaining balance."
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
              hint="We settle this directly with your financing company and you keep the difference."
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
                  onChange={(e) =>
                    set("financingBalance", parsePeso(e.target.value))
                  }
                />
              )}
            </Field>
            {draft.financingBalance ? (
              <p className="mt-2 text-xs text-ink-500">
                We&apos;ll deduct {formatPeso(draft.financingBalance)} from the
                purchase price and pay off the loan on your behalf.
              </p>
            ) : null}
          </div>
        ) : null}

        <Question
          label="Do you have a signed Deed of Sale?"
          hint="Only relevant if the CR isn't yet in your name."
        >
          <YesNo
            name="Deed of sale"
            value={draft.hasDeedOfSale}
            onChange={(v) => set("hasDeedOfSale", v)}
          />
        </Question>

        <Question label="Is the unit currently insured?">
          <YesNo
            name="Insurance"
            value={draft.hasInsurance}
            onChange={(v) => set("hasInsurance", v)}
          />
        </Question>
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
