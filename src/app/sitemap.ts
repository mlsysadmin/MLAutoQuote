import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { MAKES } from "@/lib/vehicles";
import { allGuides, guidesForMake } from "@/lib/guides";
import { toSlug } from "@/lib/seo";

// Rendered per request so it reflects APP_URL on the running service rather
// than whatever origin the image happened to be built with.
export const dynamic = "force-dynamic";

/**
 * Every page worth crawling: the landing page, the value index, one page per
 * make, and one per model guide. Private and application routes are left out
 * and blocked in robots.txt.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const makePages = MAKES.filter(
    (make) => guidesForMake(make).length > 0,
  ).map((make) => ({
    url: `${env.appUrl}/value/${toSlug(make)}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const guidePages = allGuides().map((guide) => ({
    url: `${env.appUrl}${guide.path}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    {
      url: env.appUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${env.appUrl}/value`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...makePages,
    ...guidePages,
  ];
}
