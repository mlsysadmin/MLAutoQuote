/**
 * The seller's asking price measured against what the system recommends.
 *
 * This is the first thing an appraiser wants to know and the last thing they
 * should have to work out in their head. A seller ₱20,000 over the
 * recommendation is a conversation; one at double it is a wasted trip to the
 * branch, and the difference between those two is a percentage, not a peso
 * figure — ₱276,000 over means nothing until you know it is 85% over.
 */

export type AskingComparison = {
  /** Asking minus recommended. Positive when the seller wants more. */
  deltaPhp: number;
  /** The same gap as a share of the recommendation, rounded to a percent. */
  pct: number;
  /** "above" when the seller wants more than we propose. */
  direction: "above" | "below" | "equal";
  /** True when this needs the appraiser's attention — the seller wants more. */
  overAsking: boolean;
};

export function compareAsking(
  askingPhp: number | null | undefined,
  recommendedPhp: number | null | undefined,
): AskingComparison | null {
  if (!askingPhp || askingPhp <= 0) return null;
  if (!recommendedPhp || recommendedPhp <= 0) return null;

  const deltaPhp = askingPhp - recommendedPhp;
  const pct = Math.round((Math.abs(deltaPhp) / recommendedPhp) * 100);

  return {
    deltaPhp,
    pct,
    direction: deltaPhp > 0 ? "above" : deltaPhp < 0 ? "below" : "equal",
    // Equal is not a problem, so it reads as green alongside "below".
    overAsking: deltaPhp > 0,
  };
}
