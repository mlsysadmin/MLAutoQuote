import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getViewUrls } from "@/lib/storage";
import { formatKm, formatPeso } from "@/lib/money";
import { computeBand, type OfferBreakdown } from "@/lib/valuation";
import { idTypeLabel } from "@/lib/id-types";
import { emailTransport } from "@/lib/email";
import { overrideReasonLabel } from "@/lib/offer-reasons";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  DataRow,
  OfferBadge,
  SubmissionBadge,
} from "@/components/ui";
import { OfferEditor } from "@/components/staff/OfferEditor";
import { ComparablesPanel } from "@/components/staff/ComparablesPanel";
import { PhotoGallery } from "@/components/staff/PhotoGallery";
import { GenerateOfferButton } from "@/components/staff/GenerateOfferButton";
import { EditableEmail } from "@/components/staff/EditableEmail";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const submission = await prisma.submission.findUnique({
    where: { id },
    select: { refCode: true },
  });
  return {
    title: submission ? `${submission.refCode}` : "Submission",
    robots: { index: false, follow: false },
  };
}

const SLOT_LABELS: Record<string, string> = {
  FRONT_34: "Front",
  REAR_34: "Rear",
  LEFT_SIDE: "Left side",
  RIGHT_SIDE: "Right side",
  INTERIOR_FRONT: "Interior front",
  INTERIOR_REAR: "Interior rear",
  DASH_ODOMETER: "Odometer",
  ENGINE_BAY: "Engine bay",
  TIRES: "Tires",
  DAMAGE: "Damage",
  DOC_CR: "CR",
  DOC_OR: "OR",
  DOC_ID: "ID",
  OTHER: "Other",
};

export default async function SubmissionDetailPage({ params }: Params) {
  const { id } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      customer: {
        select: {
          id: true,
          customerCode: true,
          firstName: true,
          middleName: true,
          lastName: true,
          suffix: true,
          mobile: true,
          idType: true,
          idNumber: true,
          birthDate: true,
          submissions: {
            where: { NOT: { id } },
            orderBy: { createdAt: "desc" },
            select: { id: true, make: true, model: true, year: true, status: true },
          },
        },
      },
      photos: { orderBy: [{ slot: "asc" }, { createdAt: "asc" }] },
      comparables: { orderBy: { pricePhp: "asc" } },
      offers: {
        orderBy: { version: "desc" },
        include: {
          appraiser: { select: { name: true } },
          events: {
            orderBy: { createdAt: "desc" },
            take: 12,
            include: { actor: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!submission) notFound();

  const offer = submission.offers[0] ?? null;

  // The band as the table stands right now. Excluding a listing re-renders this
  // page, so the figures beside the offer follow the appraiser's exclusions
  // immediately instead of waiting for a recalculation.
  const included = submission.comparables.filter((c) => !c.isExcluded);
  const computed = computeBand(included);
  const liveBand = computed
    ? {
        low: computed.lowPhp,
        mid: computed.midPhp,
        high: computed.highPhp,
        count: computed.count,
      }
    : null;
  const breakdown = (offer?.breakdown ?? null) as OfferBreakdown | null;

  // Sign every photo URL in one parallel pass.
  const viewUrls = await getViewUrls(submission.photos.map((p) => p.storageKey));

  const vehicleTitle =
    [submission.year, submission.make, submission.model]
      .filter(Boolean)
      .join(" ") || "Incomplete submission";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/staff"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-ink-900"
      >
        <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
          <path
            d="M16 10H5m0 0 4-4m-4 4 4 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to queue
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-ink-950">
              {vehicleTitle}
            </h1>
            <SubmissionBadge status={submission.status} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-600">
            <span className="font-mono font-bold text-ml-red-700">
              {submission.refCode}
            </span>
            {submission.variant ? <span>{submission.variant}</span> : null}
            <span>{formatKm(submission.mileageKm)}</span>
            {submission.plateNumber ? (
              <span className="font-mono">{submission.plateNumber}</span>
            ) : null}
            <span>
              Submitted{" "}
              {(submission.submittedAt ?? submission.createdAt).toLocaleString(
                "en-PH",
                { dateStyle: "medium", timeStyle: "short" },
              )}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* ── Left: evidence ──────────────────────────────────────────── */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Photos"
              description={`${submission.photos.length} uploaded by the customer`}
            />
            <CardBody>
              {submission.photos.length === 0 ? (
                <p className="py-4 text-center text-sm text-ink-500">
                  No photos were uploaded. You&apos;ll need to request them
                  before releasing an offer.
                </p>
              ) : (
                <PhotoGallery
                  photos={submission.photos.map((p) => ({
                    id: p.id,
                    slot: p.slot,
                    label: SLOT_LABELS[p.slot] ?? p.slot,
                    url: viewUrls[p.storageKey] ?? "",
                    width: p.width,
                    height: p.height,
                  }))}
                />
              )}
            </CardBody>
          </Card>

          <ComparablesPanel
            submissionId={submission.id}
            comparables={submission.comparables.map((c) => ({
              id: c.id,
              source: c.source,
              title: c.title,
              url: c.url,
              pricePhp: c.pricePhp,
              year: c.year,
              mileageKm: c.mileageKm,
              location: c.location,
              isExcluded: c.isExcluded,
              bucket: c.bucket,
              capturedAt: c.capturedAt.toISOString(),
            }))}
            make={submission.make}
            model={submission.model}
            year={submission.year}
          />

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader title="Vehicle" />
              <CardBody>
                <dl className="divide-y divide-ink-100">
                  <DataRow label="Year" value={submission.year ?? "—"} />
                  <DataRow label="Make" value={submission.make ?? "—"} />
                  <DataRow label="Model" value={submission.model ?? "—"} />
                  <DataRow label="Variant" value={submission.variant ?? "—"} />
                  <DataRow
                    label="Transmission"
                    value={title(submission.transmission)}
                  />
                  <DataRow label="Fuel" value={title(submission.fuelType)} />
                  <DataRow label="Body" value={title(submission.bodyType)} />
                  <DataRow label="Colour" value={submission.colour ?? "—"} />
                  <DataRow
                    label="Mileage"
                    value={formatKm(submission.mileageKm)}
                  />
                  <DataRow
                    label="Plate"
                    value={
                      <span className="font-mono">
                        {submission.plateNumber ?? "—"}
                      </span>
                    }
                  />
                  <DataRow
                    label="VIN"
                    value={
                      <span className="font-mono text-xs">
                        {submission.vin ?? "—"}
                      </span>
                    }
                  />
                </dl>
              </CardBody>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader title="Declared condition" />
                <CardBody>
                  <dl className="divide-y divide-ink-100">
                    <DataRow
                      label="Overall"
                      value={title(submission.conditionGrade)}
                    />
                    <DataRow
                      label="Accident repairs"
                      value={<Flag on={submission.hasAccidentHistory} bad />}
                    />
                    <DataRow
                      label="Flood history"
                      value={<Flag on={submission.isFloodDamaged} bad />}
                    />
                    <DataRow
                      label="Warning lights"
                      value={<Flag on={submission.hasWarningLights} bad />}
                    />
                    <DataRow
                      label="Aircon"
                      value={
                        submission.airconWorking ? "Working" : "Needs attention"
                      }
                    />
                    <DataRow
                      label="Tire tread"
                      value={
                        submission.tireConditionPct === null
                          ? "—"
                          : `${submission.tireConditionPct}%`
                      }
                    />
                  </dl>
                  {submission.issuesNotes ? (
                    <div className="mt-4 rounded-xl bg-ink-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-ink-500">
                        Customer notes
                      </p>
                      <p className="mt-1.5 whitespace-pre-line text-sm text-ink-800">
                        {submission.issuesNotes}
                      </p>
                    </div>
                  ) : null}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Papers" />
                <CardBody>
                  <dl className="divide-y divide-ink-100">
                    <DataRow label="CR" value={<Flag on={submission.hasCR} />} />
                    <DataRow label="OR" value={<Flag on={submission.hasOR} />} />
                    <DataRow
                      label="Last registered"
                      value={submission.lastRegistrationYear ?? "—"}
                    />
                    <DataRow
                      label="Encumbered"
                      value={<Flag on={submission.isEncumbered} bad />}
                    />
                    <DataRow
                      label="Under financing"
                      value={
                        submission.isUnderFinancing
                          ? formatPeso(submission.financingBalance)
                          : "No"
                      }
                    />
                    <DataRow
                      label="Deed of sale"
                      value={<Flag on={submission.hasDeedOfSale} />}
                    />
                    <DataRow
                      label="Insured"
                      value={<Flag on={submission.hasInsurance} />}
                    />
                  </dl>
                </CardBody>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader
              title="Customer"
              action={
                submission.customer ? (
                  <Link
                    href={`/staff/customers/${submission.customer.id}`}
                    className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-ml-red-700 ring-1 ring-inset ring-ml-red-200 hover:bg-ml-red-50"
                  >
                    Open record
                  </Link>
                ) : null
              }
            />
            <CardBody>
              {submission.customer &&
              submission.customer.submissions.length > 0 ? (
                <div className="mb-4 rounded-xl bg-[var(--color-warn-bg)] px-4 py-3 ring-1 ring-amber-300">
                  <p className="text-sm font-semibold text-ink-900">
                    This customer has brought in{" "}
                    {submission.customer.submissions.length + 1} vehicles.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {submission.customer.submissions.map((other) => (
                      <li key={other.id}>
                        <Link
                          href={`/staff/submissions/${other.id}`}
                          className="text-sm text-ink-700 hover:text-ml-red-700 hover:underline"
                        >
                          {[other.year, other.make, other.model]
                            .filter(Boolean)
                            .join(" ") || "Draft"}{" "}
                          <span className="text-ink-500">
                            · {other.status.toLowerCase().replace(/_/g, " ")}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <dl className="divide-y divide-ink-100">
                {submission.customer ? (
                  <DataRow
                    label="Customer code"
                    value={
                      <span className="font-mono text-xs font-bold text-ml-red-700">
                        {submission.customer.customerCode}
                      </span>
                    }
                  />
                ) : null}
                <DataRow label="Name" value={submission.customerName ?? "—"} />
                <DataRow
                  label="Mobile"
                  value={
                    submission.customerPhone ? (
                      <a
                        href={`tel:${submission.customerPhone}`}
                        className="font-semibold text-ml-red-700 hover:underline nums"
                      >
                        {submission.customerPhone}
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
                <DataRow
                  label="Email"
                  value={
                    <EditableEmail
                      submissionId={submission.id}
                      email={submission.customerEmail}
                    />
                  }
                />
                <DataRow
                  label="Date of birth"
                  value={
                    submission.birthDate
                      ? submission.birthDate.toLocaleDateString("en-PH", {
                          dateStyle: "medium",
                        })
                      : "—"
                  }
                />
                <DataRow label="ID" value={idTypeLabel(submission.idType)} />
                <DataRow
                  label="ID number"
                  value={
                    <span className="font-mono text-xs">
                      {submission.idNumber ?? "—"}
                    </span>
                  }
                />
                <DataRow
                  label="Address"
                  value={
                    [
                      submission.addressLine,
                      submission.barangay,
                      submission.city,
                      submission.province,
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"
                  }
                />
                <DataRow
                  label="Preferred branch"
                  value={submission.preferredBranch ?? "—"}
                />
                <DataRow
                  label="Asking price"
                  value={
                    submission.askingPricePhp !== null ? (
                      <span className="nums font-semibold">
                        {formatPeso(submission.askingPricePhp)}
                      </span>
                    ) : (
                      "Not given"
                    )
                  }
                />
              </dl>
            </CardBody>
          </Card>
        </div>

        {/* ── Right: the decision ─────────────────────────────────────── */}
        <div className="xl:sticky xl:top-20 xl:self-start">
          {offer ? (
            <OfferEditor
              // Keyed on the offer version: recalculating produces a new
              // version, and the editor must remount so the amount field shows
              // the newly proposed number rather than the superseded one.
              key={offer.id}
              offer={{
                id: offer.id,
                version: offer.version,
                status: offer.status,
                systemOfferPhp: offer.systemOfferPhp,
                appraiserOfferPhp: offer.appraiserOfferPhp,
                finalOfferPhp: offer.finalOfferPhp,
                compLowPhp: offer.compLowPhp,
                compMidPhp: offer.compMidPhp,
                compHighPhp: offer.compHighPhp,
                compCount: offer.compCount,
                appraiserNotes: offer.appraiserNotes,
                overrideReason: offer.overrideReason,
                customerMessage: offer.customerMessage,
                sentAt: offer.sentAt?.toISOString() ?? null,
                validUntil: offer.validUntil?.toISOString() ?? null,
                appraiserName: offer.appraiser?.name ?? null,
              }}
              breakdown={breakdown}
              refCode={submission.refCode}
              vehicleTitle={vehicleTitle}
              publicToken={submission.publicToken}
              liveBand={liveBand}
              delivery={{
                email: emailTransport() !== "none",
                sms: Boolean(process.env.SMS_WEBHOOK_URL),
              }}
              askingPricePhp={submission.askingPricePhp}
            />
          ) : (
            <Card>
              <CardHeader title="No offer yet" />
              <CardBody>
                <GenerateOfferButton
                  submissionId={submission.id}
                  hasComparables={submission.comparables.length > 0}
                />
              </CardBody>
            </Card>
          )}

          {/* Every version the customer was shown, newest first. A revised
              offer supersedes rather than overwrites, so this is the record of
              what was actually promised and when — the question an auditor,
              or an unhappy seller, will ask months later. */}
          {submission.offers.length > 1 ? (
            <Card className="mt-6">
              <CardHeader
                title="Offer history"
                description={`${submission.offers.length} versions`}
              />
              <CardBody>
                <ol className="space-y-3">
                  {submission.offers.map((o) => {
                    const amount =
                      o.finalOfferPhp ?? o.appraiserOfferPhp ?? o.systemOfferPhp;
                    const current = o.id === offer?.id;
                    return (
                      <li
                        key={o.id}
                        className={`rounded-xl px-3.5 py-3 ring-1 ring-inset ${
                          current
                            ? "bg-ml-red-50/60 ring-ml-red-200"
                            : "bg-ink-50 ring-ink-200/70"
                        }`}
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-sm font-bold text-ink-900 nums">
                            {formatPeso(amount)}
                          </span>
                          <span className="text-xs text-ink-500">
                            v{o.version}
                            {current ? " · current" : ""}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-ink-600">
                          {o.sentAt
                            ? `Sent ${o.sentAt.toLocaleString("en-PH", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}`
                            : "Not sent"}
                          {o.appraiser?.name ? ` · ${o.appraiser.name}` : ""}
                        </p>
                        {o.appraiserNotes ? (
                          <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-ink-700">
                            {o.appraiserNotes}
                          </p>
                        ) : null}
                        {o.overrideReason ? (
                          <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-wider text-ink-500">
                            {overrideReasonLabel(o.overrideReason)}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              </CardBody>
            </Card>
          ) : null}

          {offer && offer.events.length > 0 ? (
            <Card className="mt-6">
              <CardHeader title="Activity" />
              <CardBody>
                <ol className="space-y-3">
                  {offer.events.map((event) => (
                    <li key={event.id} className="flex gap-3">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ink-300" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink-800">
                          {eventLabel(event.type)}
                        </p>
                        <p className="text-xs text-ink-500">
                          {event.actor?.name ? `${event.actor.name} · ` : ""}
                          {event.createdAt.toLocaleString("en-PH", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>
          ) : null}

          {submission.offers.length > 1 ? (
            <Card className="mt-6">
              <CardHeader title="Earlier versions" />
              <CardBody>
                <ul className="space-y-2">
                  {submission.offers.slice(1).map((old) => (
                    <li
                      key={old.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="text-ink-600 nums">v{old.version}</span>
                      <span className="font-semibold text-ink-800 nums">
                        {formatPeso(
                          old.finalOfferPhp ??
                            old.appraiserOfferPhp ??
                            old.systemOfferPhp,
                        )}
                      </span>
                      <OfferBadge status={old.status} />
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Flag({ on, bad }: { on: boolean | null; bad?: boolean }) {
  if (on === null) return <span className="text-ink-400">—</span>;
  if (!on) {
    return bad ? (
      <span className="text-ink-700">No</span>
    ) : (
      <Badge tone="danger">Missing</Badge>
    );
  }
  return bad ? <Badge tone="danger">Yes</Badge> : <Badge tone="ok">Yes</Badge>;
}

function title(value: string | null): string {
  if (!value) return "—";
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
}

function eventLabel(type: string): string {
  const map: Record<string, string> = {
    GENERATED: "Offer generated",
    VIEWED_BY_APPRAISER: "Opened by appraiser",
    ADJUSTED: "Amount adjusted",
    SENT_TO_CUSTOMER: "Sent to customer",
    VIEWED_BY_CUSTOMER: "Opened by customer",
    ACCEPTED: "Accepted by customer",
    DECLINED: "Declined by customer",
    EXPIRED: "Expired",
    NOTE_ADDED: "Note added",
    COMPARABLES_REFRESHED: "Comparables refreshed",
  };
  return map[type] ?? type;
}
