import { EXPECTED_KM_PER_YEAR, findSpec } from "@/lib/vehicles";
import { roundToThousand } from "@/lib/money";
import type {
  ComparableQuery,
  ComparablesProvider,
  ListingCandidate,
} from "./types";
import { marketplaceSearchUrl } from "./marketplace";

/**
 * Reference provider — always available, never calls anything.
 *
 * It models the local asking-price spread for a nameplate from the catalogue's
 * SRP and depreciation curve, and labels every row as a reference estimate.
 * Its job is to keep the appraiser from staring at an empty table when no live
 * comparables have been captured yet; each row links to the live Marketplace
 * search for the same vehicle so the number can be checked immediately.
 */
export class SeedProvider implements ComparablesProvider {
  readonly id = "seed";
  readonly label = "Reference estimate";

  isEnabled(): boolean {
    return true;
  }

  async search(query: ComparableQuery): Promise<ListingCandidate[]> {
    // Deliberately age-typical, not adjusted for this unit's odometer.
    // Comparables describe the market for the model year; the adjustment layer
    // in buildAdjustments() is what prices *this* unit's mileage. Feeding the
    // subject's mileage in here as well would charge for it twice.
    const base = referenceMarketPrice({ ...query, mileageKm: null });
    if (!base) return [];

    // Deterministic per submission: recomputing an offer must not move the
    // reference band under the appraiser.
    const rand = mulberry32(hash(`${query.submissionId}:${query.make}:${query.model}`));

    const count = 9;
    const out: ListingCandidate[] = [];

    for (let i = 0; i < count; i += 1) {
      // Asking prices sit above transaction prices and skew right.
      const spread = -0.16 + (i / (count - 1)) * 0.36; // -16% .. +20%
      const noise = (rand() - 0.5) * 0.05;
      const price = roundToThousand(base * (1 + spread + noise));

      const yearOffset = Math.round((rand() - 0.5) * 2); // ±1 model year
      const year = query.year + yearOffset;
      const km = Math.max(
        5_000,
        Math.round(
          (new Date().getFullYear() - year) * EXPECTED_KM_PER_YEAR * (0.7 + rand() * 0.8),
        ),
      );

      out.push({
        source: "SEED",
        title: `${year} ${query.make} ${query.model}${query.variant ? ` ${query.variant}` : ""}`,
        url: marketplaceSearchUrl({
          make: query.make,
          model: query.model,
          year,
          minPrice: roundToThousand(price * 0.9),
          maxPrice: roundToThousand(price * 1.1),
        }),
        pricePhp: price,
        year,
        mileageKm: km,
        location: query.province ?? null,
        postedAt: null,
      });
    }

    return out;
  }
}

/**
 * Straight-line-ish depreciation off SRP, optionally adjusted for how hard the
 * unit has been used. Returns null for a nameplate we have no reference for.
 *
 * Pass `mileageKm: null` for the age-typical market price — that is what the
 * comparables band should be built from, since mileage is priced separately per
 * unit in buildAdjustments().
 */
export function referenceMarketPrice(query: ComparableQuery): number | null {
  const spec = findSpec(query.make, query.model);
  if (!spec) return null;

  const age = Math.max(0, new Date().getFullYear() - query.year);
  const depreciated = spec.newPricePhp * Math.pow(1 - spec.annualDep, age);
  const floor = spec.newPricePhp * spec.floorRatio;
  let price = Math.max(depreciated, floor);

  if (query.mileageKm && age > 0) {
    const expected = age * EXPECTED_KM_PER_YEAR;
    const excess = query.mileageKm - expected;
    // 2.5% per 10,000 km away from expected, capped at ±15%.
    const adj = clamp((-excess / 10_000) * 0.025, -0.15, 0.15);
    price *= 1 + adj;
  }

  return roundToThousand(price);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Small deterministic PRNG so the same submission always yields the same band. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
