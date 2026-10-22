"use client";

import { Alert, Checkbox, Field, Input, Select, Spinner } from "@/components/ui";
import { formatKm } from "@/lib/money";
import { toNationalDigits, toStoredPhone } from "@/lib/phone";
import { PROVINCES } from "@/lib/vehicles";
import { ID_TYPE_OPTIONS, idTypeLabel } from "@/lib/id-types";
import { REQUIRED_SLOTS, type Draft } from "@/lib/wizard";
import { StepHeading, Panel, PanelTitle, type StepProps } from "./StepShell";
import type { UploadedPhoto } from "./StepPhotos";
import {
  useIdAutofill,
  AUTOFILL_FIELD_LABELS,
  type AutofillState,
} from "./useIdAutofill";

/** The latest date of birth that still makes someone 18 today. */
function maxBirthDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
}

/**
 * The last step: who you are, and submit.
 *
 * The old separate review screen is now a summary card at the top of this one —
 * everything is still checkable, but it costs a glance rather than another tap.
 */
export function StepYou({
  draft,
  set,
  setMany,
  errors,
  photos,
  onEdit,
  submissionId,
}: StepProps & {
  photos: UploadedPhoto[];
  onEdit: (step: number) => void;
  submissionId: string | null;
}) {
  const done = new Set(
    photos.filter((p) => p.status === "done").map((p) => p.slot),
  );
  const missingPhotos = REQUIRED_SLOTS.filter((s) => !done.has(s));

  const { state: autofill, retry } = useIdAutofill({
    submissionId,
    draft,
    setMany,
    hasIdPhoto: done.has("DOC_ID"),
  });

  return (
    <>
      <StepHeading
        title="Almost done"
        description="We text your offer to this number. Your details become your customer record — the same one we use if you ever sell us another car."
      />

      <Summary draft={draft} photoCount={done.size} onEdit={onEdit} />

      {missingPhotos.length > 0 ? (
        <div className="mt-4">
          <Alert tone="warn">
            {missingPhotos.length} required photo
            {missingPhotos.length === 1 ? "" : "s"} still missing.{" "}
            <button
              type="button"
              onClick={() => onEdit(2)}
              className="font-semibold underline underline-offset-2"
            >
              Add them
            </button>{" "}
            — you can still submit, but it adds a day.
          </Alert>
        </div>
      ) : null}

      <Panel className="mt-4 space-y-5">
        <PanelTitle>Your details</PanelTitle>

        <IdAutofillNotice state={autofill} onRetry={retry} />

        <Field label="Full name" required error={errors.customerName} hint="As printed on your ID.">
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
          {/* +63 is fixed beside the box rather than typed. It is the same for
              every customer, it is what the SMS gateway needs, and showing it
              saves anyone wondering whether to write 0917 or +63917. A leading
              zero typed from habit is dropped rather than refused. */}
          <Field label="Mobile number" required error={errors.customerPhone}>
            {({ id, invalid }) => (
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-500 nums">
                  +63
                </span>
                <Input
                  id={id}
                  invalid={invalid}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={toNationalDigits(draft.customerPhone)}
                  placeholder="917 123 4567"
                  className="nums pl-13"
                  onChange={(e) =>
                    set("customerPhone", toStoredPhone(e.target.value))
                  }
                />
              </div>
            )}
          </Field>

          <Field label="Date of birth" required error={errors.birthDate}>
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

          <Field label="ID number" required error={errors.idNumber}>
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

      <Panel className="mt-4">
        <PanelTitle>Do you have a price in mind?</PanelTitle>

        <Field
          label="Your asking price"
          hint="Leave this blank if you'd rather hear our number first — plenty of people do."
        >
          {({ id }) => (
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-500">
                ₱
              </span>
              <Input
                id={id}
                inputMode="numeric"
                value={
                  draft.askingPricePhp === null
                    ? ""
                    : draft.askingPricePhp.toLocaleString("en-PH")
                }
                placeholder="450,000"
                className="nums pl-9"
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^0-9]/g, "");
                  set("askingPricePhp", digits ? Number(digits) : null);
                }}
              />
            </div>
          )}
        </Field>

        <p className="mt-3 text-xs leading-relaxed text-ink-500">
          Tell us and we&apos;ll do our best to get there. Your appraiser prices
          the car against the market, then works to reach your number — and
          where your unit is better than the listings we compare it with, they
          can come back higher than you asked.
        </p>
      </Panel>

      <details className="group mt-4 overflow-hidden rounded-[20px] bg-white shadow-[0_4px_12px_rgb(0_0_0/0.08)]">
        {/* The reason sits on the closed summary, not inside. A customer who
            never opens this panel is exactly the one who needs to know their
            proposal is posted to an email address they haven't given us. */}
        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 sm:px-6">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink-900">
              Email, address and preferred branch
              <span className="ml-2 font-normal text-ink-500">optional</span>
            </span>
            {/* Red, because this panel is collapsed and labelled optional —
                without it the line reads as small print and the customer
                skips past the address their proposal is going to. */}
            <span className="mt-1 block text-xs font-medium leading-snug text-ml-red-600">
              Add your email and we&apos;ll send your written proposal there —
              yours to keep, and to show whoever you&apos;re deciding with.
            </span>
          </span>
          <svg
            viewBox="0 0 20 20"
            className="size-4 text-ink-500 transition-transform group-open:rotate-180"
            aria-hidden="true"
          >
            <path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </summary>

        <div className="space-y-5 border-t border-ink-200/70 px-5 py-5 sm:px-6">
          <Field
            label="Email"
            error={errors.customerEmail}
            hint="Where your written proposal is sent. The text message is a short alert with the same link."
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

          <Field label="House number and street">
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

            <Field label="City">
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

          <Field label="Preferred M Lhuillier branch">
            {({ id }) => (
              <Input
                id={id}
                value={draft.preferredBranch}
                placeholder="e.g. ML Colon, Cebu City"
                onChange={(e) => set("preferredBranch", e.target.value)}
              />
            )}
          </Field>
        </div>
      </details>

      <div className="mt-4 rounded-[20px] bg-white p-5 shadow-[0_4px_12px_rgb(0_0_0/0.08)] sm:p-6">
        <Checkbox
          checked={draft.consentGiven}
          onChange={(v) => set("consentGiven", v)}
          label="I confirm these details are accurate"
          description="And I agree that M Lhuillier may keep and process the information, ID details and photos I've submitted to appraise this vehicle and maintain my customer record, in line with the Data Privacy Act."
        />
        {errors.consentGiven ? (
          <p role="alert" className="mt-2 text-xs font-semibold text-ml-red-600">
            {errors.consentGiven}
          </p>
        ) : null}
      </div>

      <p className="mt-4 px-1 text-sm leading-relaxed text-ink-600">
        We compare your car against current marketplace listings and prepare a
        proposed offer. An M Lhuillier appraiser reviews it against your photos
        and releases it — usually within 24 hours.
      </p>
    </>
  );
}

/** The old review step, compressed into a card you can scan in two seconds. */
function Summary({
  draft,
  photoCount,
  onEdit,
}: {
  draft: Draft;
  photoCount: number;
  onEdit: (step: number) => void;
}) {
  const vehicle =
    draft.year && draft.make
      ? `${draft.year} ${draft.make} ${draft.model}`
      : "Vehicle not set";

  const rows: Array<[string, string, number]> = [
    ["Vehicle", vehicle, 1],
    ["Mileage", formatKm(draft.mileageKm), 1],
    [
      "Condition",
      draft.conditionGrade
        ? draft.conditionGrade.charAt(0) +
          draft.conditionGrade.slice(1).toLowerCase()
        : "—",
      1,
    ],
    // Papers are settled on the photo step now, so that is where Edit goes.
    [
      "Papers",
      [draft.hasCR ? "CR" : null, draft.hasOR ? "OR" : null]
        .filter(Boolean)
        .join(" + ") || "None yet",
      2,
    ],
    ["Photos", photoCount > 0 ? `${photoCount} uploaded` : "None yet", 2],
  ];

  if (draft.idType) {
    rows.push(["ID", idTypeLabel(draft.idType), 3]);
  }

  return (
    <div className="rounded-[20px] bg-white p-5 shadow-[0_4px_12px_rgb(0_0_0/0.08)] sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">
          Your submission
        </h2>
      </div>
      <dl className="divide-y divide-ink-200/70">
        {rows.map(([label, value, step]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 py-2">
            <dt className="text-sm text-ink-600">{label}</dt>
            <dd className="flex items-baseline gap-3 text-right">
              <span className="text-sm font-semibold text-ink-900">{value}</span>
              <button
                type="button"
                onClick={() => onEdit(step)}
                className="text-xs font-semibold text-ml-red-700 hover:underline"
              >
                Edit
              </button>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Tells the customer what we read off their ID, in the one place it matters —
 * directly above the fields it filled. The wording invites a check rather than
 * claiming correctness, because a misread name must be easy to notice and
 * trivial to fix.
 */
function IdAutofillNotice({
  state,
  onRetry,
}: {
  state: AutofillState;
  onRetry: () => void;
}) {
  if (state.status === "idle" || state.status === "unavailable") return null;

  if (state.status === "reading") {
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-600">
        <Spinner className="text-ink-400" />
        Reading your ID…
      </div>
    );
  }

  if (state.status === "filled") {
    const labels = state.fields.map((f) => AUTOFILL_FIELD_LABELS[f] ?? f);
    return (
      <Alert tone="ok" title="Filled in from your ID">
        We read your {listToSentence(labels)} off the ID you uploaded. Please
        check {state.fields.length === 1 ? "it" : "them"} against the card and
        correct anything we got wrong.
      </Alert>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-600">
      <span>We couldn&apos;t read your ID clearly — please type your details.</span>
      <button
        type="button"
        onClick={onRetry}
        className="font-semibold text-ml-red-600 hover:underline"
      >
        Try again
      </button>
    </div>
  );
}

/** "name and date of birth", "name, ID type and ID number". */
function listToSentence(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
