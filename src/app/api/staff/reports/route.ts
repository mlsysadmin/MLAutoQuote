import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff, writeAudit } from "@/lib/auth";
import { toCsv, csvFilename, csvResponse } from "@/lib/csv";
import { overrideReasonLabel } from "@/lib/offer-reasons";
import { clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** How many rows one export may carry, so a mistyped range can't exhaust memory. */
const MAX_ROWS = 20_000;

const DATASETS = ["offers", "submissions", "customers"] as const;
type Dataset = (typeof DATASETS)[number];

/**
 * Operational exports.
 *
 * A dashboard nobody can export from gets rebuilt in a spreadsheet anyway, so
 * the numbers behind it are downloadable. Three datasets cover what finance and
 * operations actually ask for: the offer register, the submission funnel, and
 * the customer list.
 *
 *   GET /api/staff/reports?dataset=offers&from=2026-01-01&to=2026-12-31
 *
 * Every export is audited — this is customer data leaving the system, and who
 * took what, when, is worth knowing.
 */
export async function GET(req: Request) {
  const auth = await requireStaff("VIEWER");
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const requested = url.searchParams.get("dataset") ?? "offers";
  if (!DATASETS.includes(requested as Dataset)) {
    return Response.json(
      { error: `dataset must be one of: ${DATASETS.join(", ")}` },
      { status: 400 },
    );
  }
  const dataset = requested as Dataset;

  const from = parseDate(url.searchParams.get("from"));
  const to = parseDate(url.searchParams.get("to"), true);

  const range: Prisma.DateTimeFilter | undefined =
    from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } : undefined;

  const { headers, rows } = await build(dataset, range);

  await writeAudit({
    actorUserId: auth.id,
    action: "report.exported",
    entity: "Report",
    entityId: dataset,
    ip: clientIp(req),
    meta: { rows: rows.length, from: from?.toISOString(), to: to?.toISOString() },
  });

  return csvResponse(csvFilename(`autoquote-${dataset}`), toCsv(headers, rows));
}

async function build(
  dataset: Dataset,
  range: Prisma.DateTimeFilter | undefined,
): Promise<{ headers: string[]; rows: unknown[][] }> {
  if (dataset === "offers") {
    const offers = await prisma.offer.findMany({
      where: range ? { createdAt: range } : undefined,
      orderBy: { createdAt: "desc" },
      take: MAX_ROWS,
      include: {
        appraiser: { select: { name: true, branch: true } },
        submission: {
          select: {
            refCode: true,
            make: true,
            model: true,
            variant: true,
            year: true,
            mileageKm: true,
            customerName: true,
            customerPhone: true,
            province: true,
            vehicleClass: true,
            askingPricePhp: true,
            submittedAt: true,
          },
        },
      },
    });

    return {
      headers: [
        "Reference", "Offer version", "Offer status", "Class", "Vehicle", "Variant",
        "Mileage (km)", "Customer", "Mobile", "Province", "Submitted",
        "Market low", "Market mid", "Market high", "Comparables",
        "System offer", "Appraiser offer", "Offer sent", "Uplift vs system",
        "Override reason", "Spread vs market mid",
        "Seller asking price", "Asking vs offer",
        "Appraiser", "Branch",
        "Sent at", "Responded at", "Valid until",
      ],
      rows: offers.map((o) => {
        const s = o.submission;
        const finalPhp = o.finalOfferPhp ?? o.appraiserOfferPhp ?? o.systemOfferPhp;
        return [
          s.refCode,
          o.version,
          o.status,
          s.vehicleClass === "TWO_THREE_WHEEL" ? "2-3 wheels" : "4 wheels up",
          [s.year, s.make, s.model].filter(Boolean).join(" "),
          s.variant ?? "",
          s.mileageKm ?? "",
          s.customerName ?? "",
          s.customerPhone ?? "",
          s.province ?? "",
          iso(s.submittedAt),
          o.compLowPhp,
          o.compMidPhp,
          o.compHighPhp,
          o.compCount,
          o.systemOfferPhp,
          o.appraiserOfferPhp ?? "",
          o.finalOfferPhp ?? "",
          finalPhp - o.systemOfferPhp,
          overrideReasonLabel(o.overrideReason),
          o.compMidPhp > 0 ? o.compMidPhp - finalPhp : "",
          s.askingPricePhp ?? "",
          s.askingPricePhp !== null ? s.askingPricePhp - finalPhp : "",
          o.appraiser?.name ?? "",
          o.appraiser?.branch ?? "",
          iso(o.sentAt),
          iso(o.respondedAt),
          iso(o.validUntil),
        ];
      }),
    };
  }

  if (dataset === "submissions") {
    const submissions = await prisma.submission.findMany({
      where: range ? { createdAt: range } : undefined,
      orderBy: { createdAt: "desc" },
      take: MAX_ROWS,
      select: {
        refCode: true, status: true, vehicleClass: true, make: true, model: true, variant: true,
        year: true, mileageKm: true, transmission: true, fuelType: true,
        conditionGrade: true, hasAccidentHistory: true, isFloodDamaged: true,
        hasCR: true, hasOR: true, isEncumbered: true, isUnderFinancing: true,
        customerName: true, customerPhone: true, customerEmail: true,
        city: true, province: true, preferredBranch: true,
        askingPricePhp: true,
        createdAt: true, submittedAt: true,
        _count: { select: { photos: true, comparables: true, offers: true } },
      },
    });

    return {
      headers: [
        "Reference", "Status", "Class", "Vehicle", "Variant", "Year", "Mileage (km)",
        "Transmission", "Fuel", "Condition", "Accident history", "Flood history",
        "Has CR", "Has OR", "Encumbered", "Under financing",
        "Customer", "Mobile", "Email", "City", "Province", "Preferred branch",
        "Seller asking price",
        "Photos", "Comparables", "Offers", "Started", "Submitted",
      ],
      rows: submissions.map((s) => [
        s.refCode, s.status,
        s.vehicleClass === "TWO_THREE_WHEEL" ? "2-3 wheels" : "4 wheels up",
        [s.year, s.make, s.model].filter(Boolean).join(" "),
        s.variant ?? "", s.year ?? "", s.mileageKm ?? "",
        s.transmission ?? "", s.fuelType ?? "", s.conditionGrade ?? "",
        yesNo(s.hasAccidentHistory), yesNo(s.isFloodDamaged),
        yesNo(s.hasCR), yesNo(s.hasOR), yesNo(s.isEncumbered),
        yesNo(s.isUnderFinancing),
        s.customerName ?? "", s.customerPhone ?? "", s.customerEmail ?? "",
        s.city ?? "", s.province ?? "", s.preferredBranch ?? "",
        s.askingPricePhp ?? "",
        s._count.photos, s._count.comparables, s._count.offers,
        iso(s.createdAt), iso(s.submittedAt),
      ]),
    };
  }

  const customers = await prisma.customer.findMany({
    where: range ? { createdAt: range } : undefined,
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
    select: {
      customerCode: true, firstName: true, middleName: true, lastName: true,
      suffix: true, mobile: true, email: true, kycStatus: true,
      city: true, province: true, createdAt: true,
      _count: { select: { submissions: true } },
    },
  });

  return {
    headers: [
      "Customer code", "Name", "Mobile", "Email", "KYC status",
      "City", "Province", "Vehicles brought", "First seen",
    ],
    rows: customers.map((c) => [
      c.customerCode,
      [c.firstName, c.middleName, c.lastName, c.suffix].filter(Boolean).join(" "),
      c.mobile, c.email ?? "", c.kycStatus,
      c.city ?? "", c.province ?? "", c._count.submissions, iso(c.createdAt),
    ]),
  };
}

function iso(value: Date | null): string {
  return value ? value.toISOString() : "";
}

function yesNo(value: boolean | null): string {
  return value === null ? "" : value ? "Yes" : "No";
}

/** `to` covers the whole day, so a same-day range isn't empty. */
function parseDate(raw: string | null, endOfDay = false): Date | null {
  if (!raw) return null;
  const date = new Date(endOfDay ? `${raw}T23:59:59.999Z` : `${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}
