import type { ComparableSource } from "@prisma/client";

/** What the valuation engine needs to look for comparable listings. */
export type ComparableQuery = {
  submissionId: string;
  /** Four wheels or two; decides which catalogue a nameplate is looked up in. */
  vehicleClass?: string | null;
  make: string;
  model: string;
  year: number;
  variant?: string | null;
  bodyType?: string | null;
  transmission?: string | null;
  fuelType?: string | null;
  mileageKm?: number | null;
  province?: string | null;
};

/** One live listing, normalised. `url` must open the real listing or search. */
export type ListingCandidate = {
  source: ComparableSource;
  externalId?: string | null;
  title: string;
  url: string;
  pricePhp: number;
  year?: number | null;
  mileageKm?: number | null;
  location?: string | null;
  imageUrl?: string | null;
  postedAt?: Date | null;
};

/**
 * A source of comparable listings.
 *
 * Providers are tried in the order given by COMPARABLES_PROVIDERS and their
 * results are merged, so a licensed feed and the appraisal team's own entries
 * can back the same valuation.
 */
export interface ComparablesProvider {
  readonly id: string;
  /** Human label shown next to the comparables table. */
  readonly label: string;
  /** False when the provider isn't configured — it is then skipped silently. */
  isEnabled(): boolean;
  search(query: ComparableQuery): Promise<ListingCandidate[]>;
}
