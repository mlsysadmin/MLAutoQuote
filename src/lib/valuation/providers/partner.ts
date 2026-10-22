import { env } from "@/lib/env";
import type {
  ComparableQuery,
  ComparablesProvider,
  ListingCandidate,
} from "./types";

/**
 * A licensed marketplace data feed.
 *
 * Point COMPARABLES_API_URL at a provider that is permitted to redistribute
 * listing data and this becomes the primary input; leave it blank and the
 * provider disables itself. The expected response shape is documented in
 * README.md under "Plugging in a live comparables feed".
 */
export class PartnerApiProvider implements ComparablesProvider {
  readonly id = "partner";
  readonly label = "Market data feed";

  isEnabled(): boolean {
    return Boolean(env.comparables.apiUrl);
  }

  async search(query: ComparableQuery): Promise<ListingCandidate[]> {
    if (!this.isEnabled()) return [];

    const url = new URL(env.comparables.apiUrl);
    url.searchParams.set("make", query.make);
    url.searchParams.set("model", query.model);
    url.searchParams.set("year", String(query.year));
    url.searchParams.set("country", "PH");
    if (query.province) url.searchParams.set("region", query.province);
    if (query.transmission) url.searchParams.set("transmission", query.transmission);

    // A slow feed must never hold up the customer's submission.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_000);

    try {
      const res = await fetch(url, {
        headers: env.comparables.apiKey
          ? { Authorization: `Bearer ${env.comparables.apiKey}` }
          : {},
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) {
        console.error("comparables feed responded", res.status);
        return [];
      }

      const body = (await res.json()) as { listings?: unknown[] };
      return (body.listings ?? []).flatMap(normalise);
    } catch (err) {
      console.error("comparables feed failed", err);
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }
}

function normalise(raw: unknown): ListingCandidate[] {
  if (!raw || typeof raw !== "object") return [];
  const r = raw as Record<string, unknown>;

  const price = Number(r.pricePhp ?? r.price);
  const url = typeof r.url === "string" ? r.url : "";
  const title = typeof r.title === "string" ? r.title : "";
  if (!Number.isFinite(price) || price <= 0 || !url || !title) return [];

  return [
    {
      source: "PARTNER_API",
      externalId: str(r.id ?? r.externalId),
      title: title.slice(0, 400),
      url,
      pricePhp: Math.round(price),
      year: num(r.year),
      mileageKm: num(r.mileageKm ?? r.mileage),
      location: str(r.location ?? r.city),
      imageUrl: str(r.imageUrl ?? r.image),
      postedAt: r.postedAt ? new Date(String(r.postedAt)) : null,
    },
  ];
}

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
