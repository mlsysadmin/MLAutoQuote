// Deliberately not `server-only`: the seed and any future batch job need to
// price vehicles with the same engine the app uses, rather than a copy of it
// that can drift. Nothing here touches secrets or request state.
import type {
  Comparable,
  ComparableSource,
  Offer,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getBuyMargin } from "@/lib/settings";
import { roundToThousand } from "@/lib/money";
import { activeProviders, type ComparableQuery } from "./providers";
import { computeBand, type MarketBand } from "./stats";
import { buildAdjustments, type BreakdownLine } from "./adjustments";

export * from "./stats";
export * from "./adjustments";
export {
  activeProviders,
  marketplaceSearchUrl,
  marketplaceListingId,
  isMarketplaceUrl,
  referenceMarketPrice,
} from "./providers";
export type { ComparableQuery, ListingCandidate } from "./providers";

/** The full explanation stored on Offer.breakdown. */
export type OfferBreakdown = {
  /** Where the offer started from: the mid of the market band. */
  marketMidPhp: number;
  marketLowPhp: number;
  marketHighPhp: number;
  comparableCount: number;
  excludedCount: number;
  /** Share of market mid we start from, before vehicle-specific adjustments. */
  buyMargin: number;
  basePhp: number;
  lines: BreakdownLine[];
  /** Result before the floor/ceiling guardrails. */
  rawOfferPhp: number;
  /** What the guardrails allowed, and why if they bit. */
  offerPhp: number;
  clampedBy?: "floor" | "ceiling";
  sources: string[];
  generatedAt: string;
};

/** Sources whose rows are recomputed on every run; human-entered rows survive. */
const REFRESHABLE: ComparableSource[] = ["SEED", "PARTNER_API"];

/**
 * Collects comparables from every configured provider and stores them on the
 * submission. Appraiser-entered rows and their exclusions are preserved.
 */
export async function refreshComparables(
  submissionId: string,
): Promise<Comparable[]> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });
  if (!submission?.make || !submission.model || !submission.year) {
    return prisma.comparable.findMany({
      where: { submissionId },
      orderBy: { pricePhp: "asc" },
    });
  }

  const query: ComparableQuery = {
    submissionId,
    vehicleClass: submission.vehicleClass,
    make: submission.make,
    model: submission.model,
    year: submission.year,
    variant: submission.variant,
    bodyType: submission.bodyType,
    transmission: submission.transmission,
    fuelType: submission.fuelType,
    mileageKm: submission.mileageKm,
    province: submission.province,
  };

  // Providers run together; one slow feed shouldn't stall the rest.
  const results = await Promise.all(
    activeProviders().map(async (p) => {
      try {
        return await p.search(query);
      } catch (err) {
        console.error(`comparables provider ${p.id} failed`, err);
        return [];
      }
    }),
  );

  const existing = await prisma.comparable.findMany({ where: { submissionId } });
  const keptUrls = new Set(
    existing
      .filter((c) => !REFRESHABLE.includes(c.source))
      .map((c) => c.url),
  );

  const fresh = results
    .flat()
    .filter((c) => REFRESHABLE.includes(c.source))
    .filter((c) => c.pricePhp > 0 && !keptUrls.has(c.url));

  await prisma.$transaction([
    prisma.comparable.deleteMany({
      where: { submissionId, source: { in: REFRESHABLE } },
    }),
    prisma.comparable.createMany({
      data: fresh.map((c) => ({
        submissionId,
        source: c.source,
        externalId: c.externalId ?? null,
        title: c.title.slice(0, 400),
        url: c.url,
        pricePhp: c.pricePhp,
        year: c.year ?? null,
        mileageKm: c.mileageKm ?? null,
        location: c.location ?? null,
        imageUrl: c.imageUrl ?? null,
        postedAt: c.postedAt ?? null,
      })),
    }),
  ]);

  return prisma.comparable.findMany({
    where: { submissionId },
    orderBy: { pricePhp: "asc" },
  });
}

/**
 * Builds a new offer version for a submission.
 *
 * Refreshes comparables, reads the low/mid/high band off them, applies the
 * vehicle-specific adjustments, and saves the result as PENDING_REVIEW —
 * never SENT. Releasing an offer to a customer is an appraiser action and
 * lives in `sendOffer`.
 */
export async function generateOffer(
  submissionId: string,
  opts: { actorUserId?: string | null } = {},
): Promise<{ offer: Offer; band: MarketBand<Comparable> | null }> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });
  if (!submission) throw new Error("Submission not found.");

  const comparables = await refreshComparables(submissionId);
  const usable = comparables.filter((c) => !c.isExcluded);
  const band = computeBand(usable);

  // Tag which rows are the low / mid / high the appraiser sees highlighted.
  if (band) {
    await prisma.$transaction([
      prisma.comparable.updateMany({
        where: { submissionId },
        data: { bucket: null },
      }),
      prisma.comparable.update({
        where: { id: band.low.id },
        data: { bucket: "LOW" },
      }),
      prisma.comparable.update({
        where: { id: band.mid.id },
        data: { bucket: "MID" },
      }),
      prisma.comparable.update({
        where: { id: band.high.id },
        data: { bucket: "HIGH" },
      }),
    ]);
  }

  // An administrator can move this from the settings page; the environment
  // value is the fallback for a deployment that has never touched it.
  const buyMargin = await getBuyMargin();
  const marketMid = band?.midPhp ?? 0;
  const basePhp = roundToThousand(marketMid * buyMargin);

  const lines = buildAdjustments(submission);

  // Factors compound on the running total, deductions come off after.
  let running = basePhp;
  for (const line of lines) {
    if (line.kind !== "factor") continue;
    const before = running;
    running *= line.value;
    line.effectPhp = Math.round(running - before);
  }
  for (const line of lines) {
    if (line.kind !== "deduction") continue;
    running -= line.value;
    line.effectPhp = -line.value;
  }

  const rawOffer = Math.round(running);

  // Guardrails: never offer above the cheapest live asking price (we have to
  // resell against it), and never fall through the floor on a sound unit.
  let offerPhp = rawOffer;
  let clampedBy: OfferBreakdown["clampedBy"];

  if (band) {
    const ceiling = roundToThousand(band.lowPhp * 0.95);
    const floor = roundToThousand(band.midPhp * 0.4);
    if (offerPhp > ceiling) {
      offerPhp = ceiling;
      clampedBy = "ceiling";
    } else if (offerPhp < floor) {
      offerPhp = floor;
      clampedBy = "floor";
    }
  }

  offerPhp = Math.max(0, roundToThousand(offerPhp));

  const breakdown: OfferBreakdown = {
    marketMidPhp: band?.midPhp ?? 0,
    marketLowPhp: band?.lowPhp ?? 0,
    marketHighPhp: band?.highPhp ?? 0,
    comparableCount: band?.count ?? 0,
    excludedCount: comparables.length - (band?.count ?? 0),
    buyMargin,
    basePhp,
    lines,
    rawOfferPhp: rawOffer,
    offerPhp,
    clampedBy,
    sources: [...new Set(comparables.map((c) => c.source))],
    generatedAt: new Date().toISOString(),
  };

  const previous = await prisma.offer.findFirst({
    where: { submissionId },
    orderBy: { version: "desc" },
  });

  const offer = await prisma.$transaction(async (tx) => {
    if (previous && previous.status !== "SENT") {
      await tx.offer.update({
        where: { id: previous.id },
        data: { status: "SUPERSEDED" },
      });
    }

    const created = await tx.offer.create({
      data: {
        submissionId,
        version: (previous?.version ?? 0) + 1,
        status: "PENDING_REVIEW",
        compLowPhp: band?.lowPhp ?? 0,
        compMidPhp: band?.midPhp ?? 0,
        compHighPhp: band?.highPhp ?? 0,
        compCount: band?.count ?? 0,
        compLowId: band?.low.id ?? null,
        compMidId: band?.mid.id ?? null,
        compHighId: band?.high.id ?? null,
        systemOfferPhp: offerPhp,
        breakdown: breakdown as unknown as Prisma.InputJsonValue,
      },
    });

    await tx.offerEvent.create({
      data: {
        offerId: created.id,
        type: "GENERATED",
        actorUserId: opts.actorUserId ?? null,
        payload: {
          comparableCount: breakdown.comparableCount,
          systemOfferPhp: offerPhp,
        },
      },
    });

    await tx.submission.update({
      where: { id: submissionId },
      data: { status: "IN_REVIEW" },
    });

    return created;
  });

  return { offer, band };
}

/** What the customer is shown: the appraiser's number when they set one. */
export function effectiveOfferPhp(offer: {
  systemOfferPhp: number;
  appraiserOfferPhp: number | null;
  finalOfferPhp: number | null;
}): number {
  return offer.finalOfferPhp ?? offer.appraiserOfferPhp ?? offer.systemOfferPhp;
}
