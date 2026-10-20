import { env } from "@/lib/env";
import type { ComparablesProvider } from "./types";
import { ManualProvider } from "./manual";
import { PartnerApiProvider } from "./partner";
import { SeedProvider } from "./seed";

export * from "./types";
export { marketplaceSearchUrl, marketplaceListingId, isMarketplaceUrl } from "./marketplace";
export { referenceMarketPrice } from "./seed";

const REGISTRY: Record<string, () => ComparablesProvider> = {
  partner: () => new PartnerApiProvider(),
  manual: () => new ManualProvider(),
  seed: () => new SeedProvider(),
};

/** The configured providers, in priority order, skipping any not set up. */
export function activeProviders(): ComparablesProvider[] {
  return env.comparables.providers
    .map((id) => REGISTRY[id]?.())
    .filter((p): p is ComparablesProvider => Boolean(p) && p!.isEnabled());
}
