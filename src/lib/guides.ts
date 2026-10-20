import { roundToThousand } from "./money";
import { toSlug } from "./seo";
import {
  CATALOG_FROM_YEAR,
  MAKES,
  VEHICLE_CATALOG,
  type ModelSpec,
} from "./vehicles";
import { referenceMarketPrice } from "./valuation/providers/seed";

/**
 * Vehicle value guides — the part of the site Google can actually read.
 *
 * Everything else here is either an application screen or a customer's private
 * offer, so without these there is one indexable page and nothing to rank for.
 * Each guide answers a question people genuinely type ("what is a 2019 Toyota
 * Fortuner worth") with figures derived from the same reference model the
 * valuation engine uses, so the content is real rather than padding.
 *
 * Guides exist only for nameplates still sold new or discontinued within the
 * last decade. Older ones have too little search demand to justify a page, and
 * a few hundred near-identical pages is how a site earns a thin-content
 * problem rather than traffic.
 */

const CURRENT_YEAR = new Date().getFullYear();
const GUIDE_MIN_YEAR = Math.max(CATALOG_FROM_YEAR, CURRENT_YEAR - 15);

export type Guide = {
  make: string;
  model: string;
  spec: ModelSpec;
  path: string;
};

function isGuideWorthy(spec: ModelSpec): boolean {
  const lastYear = spec.to ?? CURRENT_YEAR;
  return lastYear >= CURRENT_YEAR - 10;
}

export function guidesForMake(make: string): Guide[] {
  return (VEHICLE_CATALOG[make] ?? [])
    .filter(isGuideWorthy)
    .map((spec) => ({
      make,
      model: spec.name,
      spec,
      path: `/value/${toSlug(make)}/${toSlug(spec.name)}`,
    }));
}

export function allGuides(): Guide[] {
  return MAKES.flatMap(guidesForMake);
}

export function findGuide(
  makeSlug: string,
  modelSlug: string,
): Guide | null {
  const make = MAKES.find((m) => toSlug(m) === makeSlug);
  if (!make) return null;
  return (
    guidesForMake(make).find((g) => toSlug(g.model) === modelSlug) ?? null
  );
}

export function findMake(makeSlug: string): string | null {
  return MAKES.find((m) => toSlug(m) === makeSlug) ?? null;
}

/** The model years a guide covers, newest first. */
export function guideYears(spec: ModelSpec): number[] {
  const from = Math.max(spec.from, GUIDE_MIN_YEAR);
  const to = Math.min(spec.to ?? CURRENT_YEAR, CURRENT_YEAR);
  if (to < from) return [];
  return Array.from({ length: to - from + 1 }, (_, i) => to - i);
}

export type YearValue = {
  year: number;
  low: number;
  mid: number;
  high: number;
};

/**
 * An indicative resale range for one model year.
 *
 * Built from the same depreciation reference the valuation engine falls back
 * on, widened to the spread we typically see in live asking prices. It is a
 * guide, not an offer, and every page that shows it says so.
 */
export function valueForYear(
  make: string,
  model: string,
  year: number,
): YearValue | null {
  const mid = referenceMarketPrice({
    submissionId: `guide:${make}:${model}`,
    make,
    model,
    year,
    mileageKm: null,
  });
  if (!mid) return null;

  return {
    year,
    low: roundToThousand(mid * 0.84),
    mid: roundToThousand(mid),
    high: roundToThousand(mid * 1.2),
  };
}

export function valuesForGuide(guide: Guide): YearValue[] {
  return guideYears(guide.spec)
    .map((year) => valueForYear(guide.make, guide.model, year))
    .filter((v): v is YearValue => v !== null);
}

/** Years sold, phrased for a human: "2005–present" or "2000–2017". */
export function yearsSoldLabel(spec: ModelSpec): string {
  return spec.to === null ? `${spec.from}–present` : `${spec.from}–${spec.to}`;
}

export function bodyLabel(body: string): string {
  const map: Record<string, string> = {
    SEDAN: "sedan",
    HATCHBACK: "hatchback",
    SUV: "SUV",
    MPV: "MPV",
    PICKUP: "pickup",
    VAN: "van",
    CROSSOVER: "crossover",
    COUPE: "coupe",
    OTHER: "vehicle",
  };
  return map[body] ?? "vehicle";
}

/** The handful linked from the landing page — the ones people actually search. */
export const POPULAR_GUIDES = [
  { label: "Toyota Vios", href: "/value/toyota/vios" },
  { label: "Toyota Fortuner", href: "/value/toyota/fortuner" },
  { label: "Toyota Innova", href: "/value/toyota/innova" },
  { label: "Mitsubishi Montero Sport", href: "/value/mitsubishi/montero-sport" },
  { label: "Mitsubishi Xpander", href: "/value/mitsubishi/xpander" },
  { label: "Honda City", href: "/value/honda/city" },
  { label: "Honda CR-V", href: "/value/honda/cr-v" },
  { label: "Ford Ranger", href: "/value/ford/ranger" },
  { label: "Nissan Navara", href: "/value/nissan/navara" },
  { label: "Isuzu D-Max", href: "/value/isuzu/d-max" },
];
