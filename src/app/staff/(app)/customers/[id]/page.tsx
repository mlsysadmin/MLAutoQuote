import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatKm, formatPeso } from "@/lib/money";
import {
  ageOn,
  formatMobile,
  fullName,
  isMinor,
  missingKycDetails,
} from "@/lib/kyc";
import { idTypeLabel } from "@/lib/id-types";
import { effectiveOfferPhp } from "@/lib/valuation";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  DataRow,
  SubmissionBadge,
} from "@/components/ui";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: { firstName: true, lastName: true, customerCode: true },
  });
  return {
    title: customer
      ? `${customer.firstName} ${customer.lastName}`
      : "Customer",
    robots: { index: false, follow: false },
  };
}

export default async function CustomerDetailPage({ params }: Params) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      submissions: {
        orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
        include: {
          _count: { select: { photos: true } },
          offers: {
            orderBy: { version: "desc" },
            take: 1,
            select: {
              status: true,
              systemOfferPhp: true,
              appraiserOfferPhp: true,
              finalOfferPhp: true,
            },
          },
        },
      },
      documents: true,
    },
  });

  if (!customer) notFound();

  const missing = missingKycDetails(customer);
  const age = ageOn(customer.birthDate);
  const vehicles = customer.submissions.length;

  const accepted = customer.submissions.filter((s) => s.status === "ACCEPTED");
  const totalAccepted = accepted.reduce(
    (sum, s) => sum + (s.offers[0] ? effectiveOfferPhp(s.offers[0]) : 0),
    0,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/staff/customers"
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
        Back to customers
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold text-ink-950">
              {fullName(customer)}
            </h1>
            {vehicles > 1 ? (
              <Badge tone="gold">{vehicles} vehicles</Badge>
            ) : null}
            {isMinor(customer.birthDate) ? (
              <Badge tone="danger">Under 18</Badge>
            ) : null}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-ink-600">
            <span className="font-mono font-bold text-ml-red-700">
              {customer.customerCode}
            </span>
            <span>
              On file since{" "}
              {customer.createdAt.toLocaleDateString("en-PH", {
                dateStyle: "medium",
              })}
            </span>
          </p>
        </div>

        {missing.length > 0 ? (
          <Badge tone="warn">Missing: {missing.join(", ")}</Badge>
        ) : (
          <Badge tone="ok">Record complete</Badge>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* ── The record ───────────────────────────────────────────── */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Identity" />
            <CardBody>
              <dl className="divide-y divide-ink-100">
                <DataRow label="First name" value={customer.firstName} />
                <DataRow label="Middle name" value={customer.middleName ?? "—"} />
                <DataRow label="Last name" value={customer.lastName} />
                {customer.suffix ? (
                  <DataRow label="Suffix" value={customer.suffix} />
                ) : null}
                <DataRow
                  label="Date of birth"
                  value={
                    customer.birthDate
                      ? customer.birthDate.toLocaleDateString("en-PH", {
                          dateStyle: "medium",
                        })
                      : "—"
                  }
                  hint={age !== null ? `${age} yrs` : undefined}
                />
                <DataRow label="Nationality" value={customer.nationality} />
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Government ID" />
            <CardBody>
              <dl className="divide-y divide-ink-100">
                <DataRow label="Type" value={idTypeLabel(customer.idType)} />
                <DataRow
                  label="Number"
                  value={
                    <span className="font-mono text-xs">
                      {customer.idNumber ?? "—"}
                    </span>
                  }
                />
                <DataRow
                  label="Expiry"
                  value={
                    customer.idExpiry
                      ? customer.idExpiry.toLocaleDateString("en-PH", {
                          dateStyle: "medium",
                        })
                      : "—"
                  }
                />
                <DataRow label="TIN" value={customer.tin ?? "—"} />
              </dl>
              <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-xs leading-relaxed text-ink-600">
                Declared by the customer. Sight the original ID at the branch
                before releasing payment.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Contact" />
            <CardBody>
              <dl className="divide-y divide-ink-100">
                <DataRow
                  label="Mobile"
                  value={
                    <a
                      href={`tel:+${customer.mobile}`}
                      className="font-semibold text-ml-red-700 hover:underline nums"
                    >
                      {formatMobile(customer.mobile)}
                    </a>
                  }
                />
                <DataRow label="Email" value={customer.email ?? "—"} />
                <DataRow
                  label="Address"
                  value={
                    [
                      customer.addressLine,
                      customer.barangay,
                      customer.city,
                      customer.province,
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"
                  }
                />
              </dl>
            </CardBody>
          </Card>
        </div>

        {/* ── Their vehicles ───────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <SummaryTile label="Vehicles" value={String(vehicles)} />
            <SummaryTile label="Accepted" value={String(accepted.length)} />
            <SummaryTile
              label="Total paid"
              value={totalAccepted > 0 ? formatPeso(totalAccepted) : "—"}
            />
          </div>

          <Card>
            <CardHeader
              title="Vehicles brought in"
              description={
                vehicles > 1
                  ? "This customer has submitted more than one vehicle."
                  : undefined
              }
            />
            <CardBody>
              {vehicles === 0 ? (
                <p className="py-6 text-center text-sm text-ink-500">
                  No submissions on this record yet.
                </p>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {customer.submissions.map((s) => {
                    const offer = s.offers[0];
                    return (
                      <li key={s.id} className="py-3 first:pt-0 last:pb-0">
                        <Link
                          href={`/staff/submissions/${s.id}`}
                          className="group flex flex-wrap items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-ink-900 group-hover:text-ml-red-700">
                              {[s.year, s.make, s.model]
                                .filter(Boolean)
                                .join(" ") || "Incomplete submission"}
                            </p>
                            <p className="mt-0.5 text-xs text-ink-500">
                              {[
                                s.refCode,
                                s.variant,
                                formatKm(s.mileageKm),
                                s.plateNumber,
                                `${s._count.photos} photos`,
                              ]
                                .filter((v) => v && v !== "—")
                                .join(" · ")}
                            </p>
                            <p className="mt-0.5 text-xs text-ink-400">
                              {(s.submittedAt ?? s.createdAt).toLocaleDateString(
                                "en-PH",
                                { dateStyle: "medium" },
                              )}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <SubmissionBadge status={s.status} />
                            {offer ? (
                              <p className="mt-1.5 font-bold text-ink-900 nums">
                                {formatPeso(effectiveOfferPhp(offer))}
                              </p>
                            ) : null}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>

          {customer.kycNotes ? (
            <Card>
              <CardHeader title="Notes" />
              <CardBody>
                <p className="whitespace-pre-line text-sm text-ink-700">
                  {customer.kycNotes}
                </p>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-ink-200/70">
      <p className="text-[0.7rem] font-bold uppercase tracking-wider text-ink-500">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-extrabold text-ink-950 nums">{value}</p>
    </div>
  );
}
