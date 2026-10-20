/** Helpers for pointing at Facebook Marketplace without scraping it. */

/**
 * A real, clickable Marketplace search for this exact vehicle.
 *
 * Every comparable we show carries a link; when a row came from our reference
 * dataset rather than a captured listing, this is the link — it opens the live
 * search so the appraiser can confirm the range in one click instead of
 * trusting a number.
 */
export function marketplaceSearchUrl(input: {
  make: string;
  model: string;
  year?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
}): string {
  const query = [input.make, input.model, input.year].filter(Boolean).join(" ");
  const params = new URLSearchParams({ query });
  if (input.minPrice) params.set("minPrice", String(Math.round(input.minPrice)));
  if (input.maxPrice) params.set("maxPrice", String(Math.round(input.maxPrice)));
  params.set("sortBy", "best_match");
  return `https://www.facebook.com/marketplace/search/?${params.toString()}`;
}

/** Pulls the numeric listing id out of a pasted Marketplace URL, if present. */
export function marketplaceListingId(url: string): string | null {
  const match = url.match(/marketplace\/item\/(\d+)/);
  return match ? match[1] : null;
}

export function isMarketplaceUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "facebook.com" || host === "m.facebook.com" || host === "fb.com";
  } catch {
    return false;
  }
}
