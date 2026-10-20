"use client";

import { Alert } from "@/components/ui";
import { formatKm } from "@/lib/money";
import { STEP_LABELS, REQUIRED_SLOTS, type Draft } from "@/lib/wizard";
import { idTypeLabel } from "@/lib/id-types";
import { StepHeading, Panel } from "./StepShell";
import type { UploadedPhoto } from "./StepPhotos";

export function StepReview({
  draft,
  photos,
  completion,
  onEdit,
}: {
  draft: Draft;
  photos: UploadedPhoto[];
  completion: Record<number, boolean>;
  onEdit: (step: number) => void;
}) {
  const doneSlots = new Set(
    photos.filter((p) => p.status === "done").map((p) => p.slot),
  );
  const missingPhotos = REQUIRED_SLOTS.filter((s) => !doneSlots.has(s));
  const blocking = [1, 2, 3, 4, 6].filter((n) => !completion[n]);

  return (
    <>
      <StepHeading
        title="One last look"
        description="Check anything that looks off, then send it to our appraisers."
      />

      {blocking.length > 0 ? (
        <div className="mb-5">
          <Alert tone="danger" title="A few answers are still needed">
            <ul className="mt-1 space-y-1">
              {blocking.map((n) => (
                <li key={n}>
                  <button
                    type="button"
                    onClick={() => onEdit(n)}
                    className="font-semibold underline underline-offset-2"
                  >
                    {STEP_LABELS[n - 1]}
                  </button>
                </li>
              ))}
            </ul>
          </Alert>
        </div>
      ) : null}

      {missingPhotos.length > 0 ? (
        <div className="mb-5">
          <Alert tone="warn" title={`${missingPhotos.length} required photo${missingPhotos.length === 1 ? "" : "s"} missing`}>
            You can still submit, but your appraiser will come back for them —
            which adds a day.{" "}
            <button
              type="button"
              onClick={() => onEdit(5)}
              className="font-semibold underline underline-offset-2"
            >
              Add them now
            </button>
          </Alert>
        </div>
      ) : null}

      <Panel>
        <SectionHead title="Your car" onEdit={() => onEdit(1)} />
        <dl className="divide-y divide-ink-100">
          <Row
            label="Vehicle"
            value={
              draft.year && draft.make
                ? `${draft.year} ${draft.make} ${draft.model}${draft.variant ? ` ${draft.variant}` : ""}`
                : "—"
            }
          />
          <Row label="Plate" value={draft.plateNumber || "—"} />
          <Row label="VIN" value={draft.vin || "—"} mono />
          <Row
            label="Transmission"
            value={titleCase(draft.transmission) || "—"}
          />
          <Row label="Fuel" value={titleCase(draft.fuelType) || "—"} />
          <Row label="Mileage" value={formatKm(draft.mileageKm)} />
          <Row label="Colour" value={draft.colour || "—"} />
        </dl>
      </Panel>

      <Panel className="mt-5">
        <SectionHead title="Condition" onEdit={() => onEdit(3)} />
        <dl className="divide-y divide-ink-100">
          <Row label="Overall" value={titleCase(draft.conditionGrade) || "—"} />
          <Row label="Accident repairs" value={yesNo(draft.hasAccidentHistory)} />
          <Row label="Flood history" value={yesNo(draft.isFloodDamaged)} />
          <Row label="Warning lights" value={yesNo(draft.hasWarningLights)} />
          <Row
            label="Aircon"
            value={
              draft.airconWorking === null
                ? "—"
                : draft.airconWorking
                  ? "Cold"
                  : "Needs attention"
            }
          />
          <Row
            label="Tires"
            value={
              draft.tireConditionPct === null
                ? "—"
                : `${draft.tireConditionPct}% tread`
            }
          />
          {draft.issuesNotes ? (
            <div className="py-3">
              <dt className="text-sm text-ink-600">Notes</dt>
              <dd className="mt-1 whitespace-pre-line text-sm text-ink-900">
                {draft.issuesNotes}
              </dd>
            </div>
          ) : null}
        </dl>
      </Panel>

      <Panel className="mt-5">
        <SectionHead title="Papers" onEdit={() => onEdit(4)} />
        <dl className="divide-y divide-ink-100">
          <Row label="Certificate of Registration" value={yesNo(draft.hasCR)} />
          <Row label="Official Receipt" value={yesNo(draft.hasOR)} />
          <Row label="Mortgage on CR" value={yesNo(draft.isEncumbered)} />
          <Row
            label="Under financing"
            value={
              draft.isUnderFinancing
                ? `Yes — ₱${(draft.financingBalance ?? 0).toLocaleString("en-PH")} left`
                : yesNo(draft.isUnderFinancing)
            }
          />
        </dl>
      </Panel>

      <Panel className="mt-5">
        <SectionHead
          title={`Photos (${doneSlots.size})`}
          onEdit={() => onEdit(5)}
        />
        {photos.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {photos
              .filter((p) => p.previewUrl)
              .map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.key}
                  src={p.previewUrl}
                  alt=""
                  className="size-16 rounded-lg object-cover ring-1 ring-ink-200"
                />
              ))}
          </div>
        ) : (
          <p className="text-sm text-ink-500">No photos uploaded yet.</p>
        )}
      </Panel>

      <Panel className="mt-5">
        <SectionHead title="About you" onEdit={() => onEdit(6)} />
        <dl className="divide-y divide-ink-100">
          <Row label="Name" value={draft.customerName || "—"} />
          <Row label="Mobile" value={draft.customerPhone || "—"} />
          <Row label="Email" value={draft.customerEmail || "—"} />
          <Row
            label="Date of birth"
            value={
              draft.birthDate
                ? new Date(draft.birthDate).toLocaleDateString("en-PH", {
                    dateStyle: "medium",
                  })
                : "—"
            }
          />
          <Row label="ID" value={idTypeLabel(draft.idType)} />
          <Row label="ID number" value={draft.idNumber || "—"} mono />
          <Row
            label="Address"
            value={
              [draft.addressLine, draft.barangay, draft.city, draft.province]
                .filter(Boolean)
                .join(", ") || "—"
            }
          />
        </dl>
      </Panel>

      <div className="mt-6 rounded-2xl bg-ink-900 px-5 py-5 text-sm leading-relaxed text-white/80 sm:px-6">
        <p className="font-semibold text-white">What happens next</p>
        <p className="mt-2">
          We compare your unit against current marketplace listings and prepare a
          proposed offer. An M Lhuillier appraiser reviews it against your
          photos, adjusts if needed, and releases it to you — usually within 24
          hours. You&apos;ll get a text with a link.
        </p>
      </div>
    </>
  );
}

function SectionHead({ title, onEdit }: { title: string; onEdit: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">
        {title}
      </h2>
      <button
        type="button"
        onClick={onEdit}
        className="text-sm font-semibold text-ml-red-600 hover:underline"
      >
        Edit
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-ink-600">{label}</dt>
      <dd
        className={`text-right text-sm font-medium text-ink-900 ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function yesNo(v: boolean | null): string {
  return v === null ? "—" : v ? "Yes" : "No";
}

function titleCase(s: string): string {
  if (!s) return "";
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}
