import Link from "next/link";
import type { Prisma, SubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatPeso, formatKm } from "@/lib/money";
import { SubmissionBadge, Badge } from "@/components/ui";
import { effectiveOfferPhp } from "@/lib/valuation";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const TABS: Array<{ key: string; label: string; statuses: SubmissionStatus[] }> = [
  { key: "queue", label: "Needs review", statuses: ["SUBMITTED", "IN_REVIEW"] },
  { key: "sent", label: "Offer sent", statuses: ["OFFER_SENT"] },
  { key: "closed", label: "Closed", statuses: ["ACCEPTED", "DECLINED", "EXPIRED"] },
  { key: "drafts", label: "Drafts", statuses: ["DRAFT"] },
];

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const tabKey = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "queue";
  const tab = TABS.find((t) => t.key === tabKey)!;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q ?? "").trim();

  const where: Prisma.SubmissionWhereInput = {
    status: { in: tab.statuses },
    ...(q
      ? {
          OR: [
            { refCode: { contains: q } },
            { plateNumber: { contains: q } },
            { customerName: { contains: q } },
            { customerPhone: { contains: q } },
            { vin: { contains: q } },
          ],
        }
      : {}),
  };

  // One round trip for the rows, one for the tab counts.
  const [rows, total, counts] = await Promise.all([
    prisma.submission.findMany({
      where,
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        refCode: true,
        status: true,
        make: true,
        model: true,
        year: true,
        variant: true,
        mileageKm: true,
        plateNumber: true,
        customerName: true,
        customerPhone: true,
        province: true,
        submittedAt: true,
        createdAt: true,
        _count: { select: { photos: true } },
        offers: {
          orderBy: { version: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            systemOfferPhp: true,
            appraiserOfferPhp: true,
            finalOfferPhp: true,
            compLowPhp: true,
            compHighPhp: true,
            compCount: true,
          },
        },
      },
    }),
    prisma.submission.count({ where }),
    prisma.submission.groupBy({ by: ["status"], _count: true }),
  ]);

  const countFor = (statuses: SubmissionStatus[]) =>
    counts
      .filter((c) => statuses.includes(c.status))
      .reduce((sum, c) => sum + c._count, 0);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">
            Appraisal queue
          </h1>
          <p className="mt-1 text-sm text-ink-600">
            Offers wait here until you review and release them.
          </p>
        </div>

        <form method="get" className="flex items-center gap-2">
          <input type="hidden" name="tab" value={tabKey} />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Ref, plate, name or phone"
            aria-label="Search submissions"
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

      <div className="mt-6 flex flex-wrap gap-1 border-b border-ink-200">
        {TABS.map((t) => {
          const active = t.key === tabKey;
          const count = countFor(t.statuses);
          return (
            <Link
              key={t.key}
              href={`/staff?tab=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "border-ml-red-600 text-ml-red-700"
                  : "border-transparent text-ink-600 hover:text-ink-900"
              }`}
            >
              {t.label}
              {count > 0 ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[0.7rem] nums ${
                    active ? "bg-ml-red-100 text-ml-red-700" : "bg-ink-200 text-ink-700"
                  }`}
                >
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-base font-semibold text-ink-800">
            {q ? "No matches" : "Nothing here right now"}
          </p>
          <p className="mt-1 text-sm text-ink-500">
            {q
              ? "Try a different reference, plate or phone number."
              : "New submissions land here as soon as customers finish the form."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-5 hidden overflow-hidden rounded-2xl bg-white ring-1 ring-ink-200/70 lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/60 text-left">
                  <Th>Reference</Th>
                  <Th>Vehicle</Th>
                  <Th>Customer</Th>
                  <Th className="text-right">Market band</Th>
                  <Th className="text-right">Proposed</Th>
                  <Th>Status</Th>
                  <Th>Submitted</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((row) => {
                  const offer = row.offers[0];
                  return (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-ml-red-50/40"
                    >
                      <Td>
                        <Link
                          href={`/staff/submissions/${row.id}`}
                          className="font-mono text-xs font-bold text-ml-red-700 hover:underline"
                        >
                          {row.refCode}
                        </Link>
                        <p className="mt-0.5 text-[0.7rem] text-ink-500 nums">
                          {row._count.photos} photo
                          {row._count.photos === 1 ? "" : "s"}
                        </p>
                      </Td>
                      <Td>
                        <Link
                          href={`/staff/submissions/${row.id}`}
                          className="font-semibold text-ink-900 hover:underline"
                        >
                          {[row.year, row.make, row.model]
                            .filter(Boolean)
                            .join(" ") || "Incomplete"}
                        </Link>
                        <p className="mt-0.5 text-xs text-ink-500">
                          {[row.variant, formatKm(row.mileageKm), row.plateNumber]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </Td>
                      <Td>
                        <p className="font-medium text-ink-900">
                          {row.customerName ?? "—"}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-500 nums">
                          {[row.customerPhone, row.province]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </Td>
                      <Td className="text-right">
                        {offer && offer.compCount > 0 ? (
                          <>
                            <p className="text-xs text-ink-700 nums">
                              {formatPeso(offer.compLowPhp)} –{" "}
                              {formatPeso(offer.compHighPhp)}
                            </p>
                            <p className="mt-0.5 text-[0.7rem] text-ink-500 nums">
                              {offer.compCount} listings
                            </p>
                          </>
                        ) : (
                          <span className="text-xs text-ink-400">
                            No comparables
                          </span>
                        )}
                      </Td>
                      <Td className="text-right">
                        {offer ? (
                          <>
                            <p className="font-bold text-ink-900 nums">
                              {formatPeso(effectiveOfferPhp(offer))}
                            </p>
                            {offer.appraiserOfferPhp !== null &&
                            offer.appraiserOfferPhp !== offer.systemOfferPhp ? (
                              <p className="mt-0.5 text-[0.7rem] text-ink-500 line-through nums">
                                {formatPeso(offer.systemOfferPhp)}
                              </p>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-xs text-ink-400">—</span>
                        )}
                      </Td>
                      <Td>
                        <SubmissionBadge status={row.status} />
                      </Td>
                      <Td>
                        <span className="text-xs text-ink-600">
                          {relative(row.submittedAt ?? row.createdAt)}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="mt-5 space-y-3 lg:hidden">
            {rows.map((row) => {
              const offer = row.offers[0];
              return (
                <li key={row.id}>
                  <Link
                    href={`/staff/submissions/${row.id}`}
                    className="block rounded-2xl bg-white p-4 ring-1 ring-ink-200/70 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[0.7rem] font-bold text-ml-red-700">
                          {row.refCode}
                        </p>
                        <p className="mt-0.5 truncate font-semibold text-ink-900">
                          {[row.year, row.make, row.model]
                            .filter(Boolean)
                            .join(" ") || "Incomplete"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-ink-500">
                          {row.customerName} · {formatKm(row.mileageKm)}
                        </p>
                      </div>
                      <SubmissionBadge status={row.status} />
                    </div>

                    <div className="mt-3 flex items-end justify-between gap-3 border-t border-ink-100 pt-3">
                      <div>
                        <p className="text-[0.7rem] uppercase tracking-wider text-ink-500">
                          Proposed
                        </p>
                        <p className="text-lg font-extrabold text-ink-900 nums">
                          {offer ? formatPeso(effectiveOfferPhp(offer)) : "—"}
                        </p>
                      </div>
                      {offer && offer.compCount > 0 ? (
                        <Badge tone="neutral">
                          {offer.compCount} comparables
                        </Badge>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {pages > 1 ? (
        <nav className="mt-6 flex items-center justify-between text-sm">
          <PageLink
            href={`/staff?tab=${tabKey}&page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            disabled={page <= 1}
          >
            Previous
          </PageLink>
          <span className="text-ink-600 nums">
            Page {page} of {pages}
          </span>
          <PageLink
            href={`/staff?tab=${tabKey}&page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            disabled={page >= pages}
          >
            Next
          </PageLink>
        </nav>
      ) : null}
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

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="text-ink-300">{children}</span>;
  }
  return (
    <Link href={href} className="font-semibold text-ml-red-700 hover:underline">
      {children}
    </Link>
  );
}

function relative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString("en-PH", { day: "numeric", month: "short" });
}
