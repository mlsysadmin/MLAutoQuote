import { prisma } from "@/lib/prisma";
import type {
  ComparableQuery,
  ComparablesProvider,
  ListingCandidate,
} from "./types";

/**
 * Listings captured by people rather than a feed: an appraiser pasting
 * Marketplace links into the submission, or your ops collector posting to
 * /api/ingest/comparables.
 *
 * These are already rows on the submission, so the provider just reads them
 * back — this keeps appraiser-entered comparables inside the same ranking and
 * outlier logic as every other source.
 */
export class ManualProvider implements ComparablesProvider {
  readonly id = "manual";
  readonly label = "Captured listings";

  isEnabled(): boolean {
    return true;
  }

  async search(query: ComparableQuery): Promise<ListingCandidate[]> {
    const rows = await prisma.comparable.findMany({
      where: {
        submissionId: query.submissionId,
        source: { in: ["MANUAL", "FACEBOOK_MARKETPLACE"] },
      },
      orderBy: { pricePhp: "asc" },
    });

    return rows.map((r) => ({
      source: r.source,
      externalId: r.externalId,
      title: r.title,
      url: r.url,
      pricePhp: r.pricePhp,
      year: r.year,
      mileageKm: r.mileageKm,
      location: r.location,
      imageUrl: r.imageUrl,
      postedAt: r.postedAt,
    }));
  }
}
