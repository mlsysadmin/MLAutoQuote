import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatKm, formatPeso } from "@/lib/money";
import { formatMobile, fullName } from "@/lib/kyc";
import { effectiveOfferPhp } from "@/lib/valuation";
import { Badge, SubmissionBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * The vehicle-first view.
 *
 * The queue answers "what came in today"; this answers "who has brought us a
 * Fortuner". Without a make and model it lists every nameplate we've seen with
 * how many came in and how many different people brought them; pick one and it
 * lists those vehicles with the customer behind each.
 */
export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; make?: string; model?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const make = (sp.make ?? "").trim();
  const model = (sp.model ?? "").trim();

  if (make && model) {
    return <VehicleDetail make={make} model={model} />;
  }

  const where: Prisma.SubmissionWhereInput = {
    make: { not: null },
    model: { not: null },
    ...(q
      ? {
          OR: [
            { make: { contains: q } },
            { model: { contains: q } },
            { variant: { contains: q } },
            { plateNumber: { contains: q } },
            { vin: { contains: q } },
          ],
        }
      : {}),
  };

  const grouped = await prisma.submission.groupBy({
    by: ["make", "model"],
    where,
    _count: { _all: true },
    _avg: { year: true, mileageKm: true },
    orderBy: { _count: { id: "desc" } },
    take: 80,
  });

  // How many distinct people brought each nameplate, and whether any one of
  // them brought more than one — a single query, not one per row.
  const byCustomer = await prisma.submission.groupBy({
    by: ["make", "model", "customerId"],
    where: { ...where, customerId: { not: null } },
    _count: { _all: true },
  });

  const ownerCount = new Map<string, number>();
  const hasRepeatOwner = new Set<string>();
  for (const row of byCustomer) {
    const key = `${row.make}|${row.model}`;
    ownerCount.set(key, (ownerCount.get(key) ?? 0) + 1);
    // The badge means "someone bought two of these", not "we have more units
    // than linked customers" — unlinked legacy rows would fake the latter.
    if (row._count._all > 1) hasRepeatOwner.add(key);
  }

  const totalUnits = grouped.reduce((s, g) => s + g._count._all, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">Vehicles</h1>
          <p className="mt-1 text-sm text-ink-600">
            Every nameplate we&apos;ve been offered — {totalUnits} units across{" "}
            {grouped.length} models.
          </p>
        </div>

        <form method="get" className="flex items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Make, model, plate or VIN"
            aria-label="Search vehicles"
            className="w-56 rounded-xl bg-white px-3.5 py-2 text-sm ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-ml-red-500 focus:outline-none sm:w-72"
          />
          <button
            type="submit"
            className="rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-800"
          >
            Search
          </button>
        </form>
      </div>

      {grouped.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-base font-semibold text-ink-800">No matches</p>
          <p className="mt-1 text-sm text-ink-500">
            Try a different make, model or plate number.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-ink-200/70">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/60 text-left">
                <Th>Vehicle</Th>
                <Th className="text-right">Units</Th>
                <Th className="text-right">Customers</Th>
                <Th className="text-right">Avg. year</Th>
                <Th className="text-right">Avg. mileage</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {grouped.map((g) => {
                const key = `${g.make}|${g.model}`;
                const owners = ownerCount.get(key) ?? 0;
                const repeat = hasRepeatOwner.has(key);

                return (
                  <tr key={key} className="transition-colors hover:bg-ml-red-50/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/staff/vehicles?make=${encodeURIComponent(g.make!)}&model=${encodeURIComponent(g.model!)}`}
                        className="font-semibold text-ink-900 hover:text-ml-red-700 hover:underline"
                      >
                        {g.make} {g.model}
                      </Link>
                      {repeat ? (
                        <span className="ml-2">
                          <Badge tone="gold">same owner, 2+</Badge>
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-ink-900 nums">
                      {g._count._all}
                    </td>
                    <td className="px-4 py-3 text-right text-ink-700 nums">
                      {owners || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-ink-700 nums">
                      {g._avg.year ? Math.round(g._avg.year) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-ink-700 nums">
                      {g._avg.mileageKm
                        ? formatKm(Math.round(g._avg.mileageKm))
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Every unit of one nameplate, with the customer behind each. */
async function VehicleDetail({ make, model }: { make: string; model: string }) {
  const submissions = await prisma.submission.findMany({
    where: { make, model },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
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
          _count: { select: { submissions: true } },
        },
      },
      offers: {
        orderBy: { version: "desc" },
        take: 1,
        select: {
          systemOfferPhp: true,
          appraiserOfferPhp: true,
          finalOfferPhp: true,
          compMidPhp: true,
        },
      },
    },
  });

  const owners = new Set(
    submissions.map((s) => s.customerId).filter(Boolean) as string[],
  );
  const offers = submissions
    .map((s) => (s.offers[0] ? effectiveOfferPhp(s.offers[0]) : 0))
    .filter((v) => v > 0);
  const avgOffer =
    offers.length > 0
      ? Math.round(offers.reduce((a, b) => a + b, 0) / offers.length)
      : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/staff/vehicles"
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
        All vehicles
      </Link>

      <h1 className="mt-4 text-2xl font-extrabold text-ink-950">
        {make} {model}
      </h1>
      <p className="mt-1 text-sm text-ink-600">
        {submissions.length} unit{submissions.length === 1 ? "" : "s"} from{" "}
        {owners.size} customer{owners.size === 1 ? "" : "s"}
        {avgOffer ? ` · average offer ${formatPeso(avgOffer)}` : ""}
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-ink-200/70">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50/60 text-left">
              <Th>Reference</Th>
              <Th>Year &amp; variant</Th>
              <Th>Customer</Th>
              <Th className="text-right">Mileage</Th>
              <Th className="text-right">Offer</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {submissions.map((s) => (
              <tr key={s.id} className="transition-colors hover:bg-ml-red-50/40">
                <td className="px-4 py-3">
                  <Link
                    href={`/staff/submissions/${s.id}`}
                    className="font-mono text-xs font-bold text-ml-red-700 hover:underline"
                  >
                    {s.refCode}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-ink-900 nums">
                    {s.year ?? "—"}
                  </span>
                  {s.variant ? (
                    <span className="ml-2 text-xs text-ink-500">{s.variant}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {s.customer ? (
                    <>
                      <Link
                        href={`/staff/customers/${s.customer.id}`}
                        className="font-medium text-ink-900 hover:text-ml-red-700 hover:underline"
                      >
                        {fullName(s.customer)}
                      </Link>
                      <p className="mt-0.5 text-xs text-ink-500 nums">
                        {formatMobile(s.customer.mobile)}
                        {s.customer._count.submissions > 1 ? (
                          <span className="ml-2 font-semibold text-ml-red-700">
                            {s.customer._count.submissions} vehicles
                          </span>
                        ) : null}
                      </p>
                    </>
                  ) : (
                    <span className="text-ink-500">{s.customerName ?? "—"}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-ink-700 nums">
                  {formatKm(s.mileageKm)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-ink-900 nums">
                  {s.offers[0] ? formatPeso(effectiveOfferPhp(s.offers[0])) : "—"}
                </td>
                <td className="px-4 py-3">
                  <SubmissionBadge status={s.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-ink-500 ${className}`}
    >
      {children}
    </th>
  );
}
