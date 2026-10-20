/** Turning a pile of asking prices into a defensible low / mid / high band. */

export type PricePoint<T> = T & { pricePhp: number };

export type MarketBand<T> = {
  low: PricePoint<T>;
  mid: PricePoint<T>;
  high: PricePoint<T>;
  /** Listings that survived outlier trimming, sorted ascending by price. */
  kept: PricePoint<T>[];
  /** Listings trimmed as outliers — kept visible so the appraiser can see why. */
  excluded: PricePoint<T>[];
  lowPhp: number;
  midPhp: number;
  highPhp: number;
  count: number;
};

/**
 * Trims outliers with the 1.5×IQR rule before reading off the band.
 *
 * Marketplace listings routinely include a ₱35,000 "for parts" shell and a
 * ₱2.4M typo on the same search. Left in, either one drags the offer somewhere
 * indefensible, so they are removed from the maths but still shown.
 */
export function computeBand<T>(
  listings: PricePoint<T>[],
): MarketBand<T> | null {
  if (listings.length === 0) return null;

  const sorted = [...listings].sort((a, b) => a.pricePhp - b.pricePhp);

  // Fewer than 4 points can't support an IQR; use them all.
  let kept = sorted;
  let excluded: PricePoint<T>[] = [];

  if (sorted.length >= 4) {
    const prices = sorted.map((l) => l.pricePhp);
    const q1 = quantile(prices, 0.25);
    const q3 = quantile(prices, 0.75);
    const iqr = q3 - q1;
    const lowFence = q1 - 1.5 * iqr;
    const highFence = q3 + 1.5 * iqr;

    const inside = sorted.filter(
      (l) => l.pricePhp >= lowFence && l.pricePhp <= highFence,
    );
    // Never trim so hard that nothing credible is left.
    if (inside.length >= 3) {
      kept = inside;
      excluded = sorted.filter(
        (l) => l.pricePhp < lowFence || l.pricePhp > highFence,
      );
    }
  }

  const prices = kept.map((l) => l.pricePhp);
  const midPhp = Math.round(quantile(prices, 0.5));

  // The representative "mid" listing is the kept one nearest the median, so the
  // appraiser can open a real link for it rather than a computed number.
  const mid = kept.reduce((best, l) =>
    Math.abs(l.pricePhp - midPhp) < Math.abs(best.pricePhp - midPhp) ? l : best,
  );

  return {
    low: kept[0],
    mid,
    high: kept[kept.length - 1],
    kept,
    excluded,
    lowPhp: kept[0].pricePhp,
    midPhp,
    highPhp: kept[kept.length - 1].pricePhp,
    count: kept.length,
  };
}

/** Linear-interpolated quantile over an ascending array. */
export function quantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0];

  const pos = (sortedAsc.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;

  const next = sortedAsc[base + 1];
  return next === undefined
    ? sortedAsc[base]
    : sortedAsc[base] + rest * (next - sortedAsc[base]);
}

export function median(values: number[]): number {
  return quantile([...values].sort((a, b) => a - b), 0.5);
}
