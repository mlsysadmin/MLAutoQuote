import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatPeso, formatKm } from "@/lib/money";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { BarList, ColumnChart, StatTile, type Datum } from "@/components/staff/Charts";

export const metadata: Metadata = {
  title: "Trends",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const TITLE_CASE = (s: string) =>
  s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

/**
 * What is actually coming through the door.
 *
 * Every chart here is a single series, so each uses one hue — colour would
 * otherwise be encoding rank. Bars are ranked and labelled with their value and
 * share, and each has a table view for the numbers.
 */
export default async function DashboardPage() {
  const submitted = { status: { not: "DRAFT" as const } };

  const [
    totals,
    customerCount,
    repeatRows,
    byMake,
    byYear,
    byBody,
    byProvince,
    byTransmission,
    byStatus,
    acceptedOffers,
    allSentOffers,
    mileageAgg,
  ] = await Promise.all([
    prisma.submission.count({ where: submitted }),
    prisma.customer.count(),
    prisma.submission.groupBy({
      by: ["customerId"],
      where: { customerId: { not: null } },
      _count: { _all: true },
      having: { customerId: { _count: { gt: 1 } } },
    }),
    prisma.submission.groupBy({
      by: ["make"],
      where: { ...submitted, make: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: 12,
    }),
    prisma.submission.groupBy({
      by: ["year"],
      where: { ...submitted, year: { not: null } },
      _count: { _all: true },
    }),
    prisma.submission.groupBy({
      by: ["bodyType"],
      where: { ...submitted, bodyType: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.submission.groupBy({
      by: ["province"],
      where: { ...submitted, province: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    }),
    prisma.submission.groupBy({
      by: ["transmission"],
      where: { ...submitted, transmission: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.submission.groupBy({
      by: ["status"],
      where: submitted,
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.offer.aggregate({
      where: { status: "ACCEPTED" },
      _sum: { finalOfferPhp: true },
      _avg: { finalOfferPhp: true },
      _count: { _all: true },
    }),
    prisma.offer.aggregate({
      where: { status: { in: ["SENT", "ACCEPTED", "DECLINED", "EXPIRED"] } },
      _count: { _all: true },
      _avg: { finalOfferPhp: true, compMidPhp: true },
    }),
    prisma.submission.aggregate({
      where: { ...submitted, mileageKm: { not: null } },
      _avg: { mileageKm: true },
    }),
  ]);

  const toData = <T extends { _count: { _all: number } }>(
    rows: T[],
    label: (row: T) => string,
  ): Datum[] =>
    rows.map((row) => ({ label: label(row), value: row._count._all }));

  // Model years need every year in the range present, including the empty ones,
  // or the distribution lies about where the gaps are.
  const yearCounts = new Map<number, number>();
  for (const row of byYear) {
    if (row.year !== null) yearCounts.set(row.year, row._count._all);
  }
  const years = [...yearCounts.keys()].sort((a, b) => a - b);
  const yearData: Datum[] =
    years.length === 0
      ? []
      : Array.from(
          { length: years[years.length - 1] - years[0] + 1 },
          (_, i) => years[0] + i,
        ).map((y) => ({ label: String(y), value: yearCounts.get(y) ?? 0 }));

  const sentCount = allSentOffers._count._all;
  const acceptedCount = acceptedOffers._count._all;
  const acceptanceRate =
    sentCount > 0 ? Math.round((acceptedCount / sentCount) * 100) : null;

  // How far below the market mid our accepted offers land — the margin signal.
  const avgFinal = allSentOffers._avg.finalOfferPhp ?? 0;
  const avgMid = allSentOffers._avg.compMidPhp ?? 0;
  const marginPct =
    avgMid > 0 ? Math.round((avgFinal / avgMid) * 100) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">Trends</h1>
          <p className="mt-1 text-sm text-ink-600">
            What is coming through the door, and what we&apos;re paying for it.
          </p>
        </div>
        <Link
          href="/staff/vehicles"
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"
        >
          Browse by vehicle
        </Link>
      </div>

      {totals === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-base font-semibold text-ink-800">
            Nothing submitted yet
          </p>
          <p className="mt-1 text-sm text-ink-500">
            Charts appear once customers start sending vehicles in.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Submissions"
              value={String(totals)}
              hint={`${customerCount} customers on file`}
            />
            <StatTile
              label="Offers sent"
              value={String(sentCount)}
              hint={
                acceptanceRate !== null
                  ? `${acceptanceRate}% accepted`
                  : undefined
              }
            />
            <StatTile
              label="Accepted value"
              value={
                acceptedOffers._sum.finalOfferPhp
                  ? formatPeso(acceptedOffers._sum.finalOfferPhp)
                  : "—"
              }
              hint={
                acceptedOffers._avg.finalOfferPhp
                  ? `${formatPeso(Math.round(acceptedOffers._avg.finalOfferPhp))} average`
                  : undefined
              }
              tone="accent"
            />
            <StatTile
              label="Repeat sellers"
              value={String(repeatRows.length)}
              hint="people with more than one vehicle"
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Model years"
                description="The age profile of what we're being offered."
              />
              <CardBody>
                <ColumnChart data={yearData} unit="submissions" />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Makes"
                description="Top 12 by number of units offered."
              />
              <CardBody>
                <BarList data={toData(byMake, (r) => r.make ?? "—")} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Body types" />
              <CardBody>
                <BarList
                  data={toData(byBody, (r) => TITLE_CASE(r.bodyType ?? "—"))}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Where they are" description="Top 8 provinces." />
              <CardBody>
                <BarList data={toData(byProvince, (r) => r.province ?? "—")} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Transmission" />
              <CardBody>
                <BarList
                  data={toData(byTransmission, (r) =>
                    TITLE_CASE(r.transmission ?? "—"),
                  )}
                />
              </CardBody>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader
                title="Where submissions stand"
                description="Everything that has been submitted, by current status."
              />
              <CardBody>
                <BarList
                  data={toData(byStatus, (r) => TITLE_CASE(r.status))}
                  unit="submissions"
                />
              </CardBody>
            </Card>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StatTile
              label="Average mileage"
              value={
                mileageAgg._avg.mileageKm
                  ? formatKm(Math.round(mileageAgg._avg.mileageKm))
                  : "—"
              }
              hint="across submitted vehicles"
            />
            <StatTile
              label="Offer vs market mid"
              value={marginPct !== null ? `${marginPct}%` : "—"}
              hint="average released offer against the market middle"
            />
            <StatTile
              label="Average market mid"
              value={avgMid > 0 ? formatPeso(Math.round(avgMid)) : "—"}
              hint="asking price our offers were priced against"
            />
          </div>
        </>
      )}
    </div>
  );
}
