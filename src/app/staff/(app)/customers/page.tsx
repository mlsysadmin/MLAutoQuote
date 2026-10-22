import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMobile, fullName, missingKycDetails, ageOn, isMinor } from "@/lib/kyc";
import { idTypeLabel } from "@/lib/id-types";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

/**
 * The customer registry — everyone who has ever submitted a vehicle.
 *
 * Sorted by most recent activity, and the vehicle count is called out so a
 * repeat seller is obvious at a glance rather than something you'd only notice
 * by reading names.
 */
export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; filter?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const filter = sp.filter ?? "all";

  const where: Prisma.CustomerWhereInput = {
    ...(q
      ? {
          OR: [
            { customerCode: { contains: q } },
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { mobile: { contains: q.replace(/[^0-9]/g, "") || q } },
            { email: { contains: q } },
            { idNumber: { contains: q } },
          ],
        }
      : {}),
    ...(filter === "repeat"
      ? { submissions: { some: {} } }
      : filter === "incomplete"
        ? { OR: [{ birthDate: null }, { idNumber: null }] }
        : {}),
  };

  const [customers, total, repeatCount, incompleteCount, allCount] =
    await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          _count: { select: { submissions: true } },
          submissions: {
            orderBy: { createdAt: "desc" },
            take: 4,
            select: { id: true, make: true, model: true, year: true, status: true },
          },
        },
      }),
      prisma.customer.count({ where }),
      prisma.customer.count({ where: { submissions: { some: {} } } }),
      prisma.customer.count({
        where: { OR: [{ birthDate: null }, { idNumber: null }] },
      }),
      prisma.customer.count(),
    ]);

  // One query for the repeat sellers, rather than a count per row.
  const multiVehicle = await prisma.submission.groupBy({
    by: ["customerId"],
    where: { customerId: { not: null } },
    _count: { _all: true },
    having: { customerId: { _count: { gt: 1 } } },
  });
  const repeatSellers = multiVehicle.length;

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const TABS = [
    { key: "all", label: "Everyone", count: allCount },
    { key: "repeat", label: "Has submitted", count: repeatCount },
    { key: "incomplete", label: "Missing details", count: incompleteCount },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">Customers</h1>
          <p className="mt-1 text-sm text-ink-600">
            Every person who has submitted a vehicle.{" "}
            {repeatSellers > 0 ? (
              <span className="font-semibold text-ink-800">
                {repeatSellers} {repeatSellers === 1 ? "person has" : "people have"}{" "}
                brought in more than one.
              </span>
            ) : null}
          </p>
        </div>

        <form method="get" className="flex items-center gap-2">
          <input type="hidden" name="filter" value={filter} />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Name, mobile, code or ID number"
            aria-label="Search customers"
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
          const active = t.key === filter;
          return (
            <Link
              key={t.key}
              href={`/staff/customers?filter=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "border-ml-red-600 text-ml-red-700"
                  : "border-transparent text-ink-600 hover:text-ink-900"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[0.7rem] nums ${
                  active ? "bg-ml-red-100 text-ml-red-700" : "bg-ink-200 text-ink-700"
                }`}
              >
                {t.count}
              </span>
            </Link>
          );
        })}
      </div>

      {customers.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-base font-semibold text-ink-800">
            {q ? "No matches" : "No customers yet"}
          </p>
          <p className="mt-1 text-sm text-ink-500">
            {q
              ? "Try a different name, mobile number or customer code."
              : "A record is created the moment someone submits a vehicle."}
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {customers.map((c) => {
            const missing = missingKycDetails(c);
            const vehicles = c._count.submissions;
            const age = ageOn(c.birthDate);

            return (
              <li key={c.id}>
                <Link
                  href={`/staff/customers/${c.id}`}
                  className="block rounded-2xl bg-white p-5 ring-1 ring-ink-200/70 transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-ink-900">
                          {fullName(c)}
                        </h2>
                        <span className="font-mono text-[0.7rem] font-bold text-ml-red-700">
                          {c.customerCode}
                        </span>
                        {vehicles > 1 ? (
                          <Badge tone="gold">{vehicles} vehicles</Badge>
                        ) : null}
                        {isMinor(c.birthDate) ? (
                          <Badge tone="danger">Under 18</Badge>
                        ) : null}
                      </div>

                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-600">
                        <span className="nums">{formatMobile(c.mobile)}</span>
                        {c.email ? <span>{c.email}</span> : null}
                        {c.city || c.province ? (
                          <span>
                            {[c.city, c.province].filter(Boolean).join(", ")}
                          </span>
                        ) : null}
                        {age !== null ? <span>{age} yrs</span> : null}
                      </p>

                      <p className="mt-1 text-xs text-ink-500">
                        {c.idNumber ? (
                          <>
                            {idTypeLabel(c.idType)} ·{" "}
                            <span className="font-mono">{c.idNumber}</span>
                          </>
                        ) : (
                          "No ID on file"
                        )}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      {missing.length > 0 ? (
                        <Badge tone="warn">
                          Missing {missing.length === 1 ? missing[0].toLowerCase() : `${missing.length} details`}
                        </Badge>
                      ) : (
                        <Badge tone="ok">Record complete</Badge>
                      )}
                      <p className="mt-1.5 text-xs text-ink-500">
                        Joined{" "}
                        {c.createdAt.toLocaleDateString("en-PH", {
                          dateStyle: "medium",
                        })}
                      </p>
                    </div>
                  </div>

                  {c.submissions.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-ink-100 pt-3">
                      {c.submissions.map((s) => (
                        <span
                          key={s.id}
                          className="rounded-lg bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-700"
                        >
                          {[s.year, s.make, s.model].filter(Boolean).join(" ") ||
                            "Draft"}
                        </span>
                      ))}
                      {vehicles > c.submissions.length ? (
                        <span className="px-1 py-1 text-xs text-ink-500">
                          +{vehicles - c.submissions.length} more
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 ? (
        <nav className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={`/staff/customers?filter=${filter}&page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className="font-semibold text-ml-red-700 hover:underline"
            >
              Previous
            </Link>
          ) : (
            <span className="text-ink-300">Previous</span>
          )}
          <span className="text-ink-600 nums">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link
              href={`/staff/customers?filter=${filter}&page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className="font-semibold text-ml-red-700 hover:underline"
            >
              Next
            </Link>
          ) : (
            <span className="text-ink-300">Next</span>
          )}
        </nav>
      ) : null}
    </div>
  );
}
