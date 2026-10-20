import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/**
 * The marketing pages are indexable; everything that could expose a customer's
 * submission or the staff portal is not.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/staff", "/staff/", "/track/", "/sell", "/api/"],
    },
    sitemap: `${env.appUrl}/sitemap.xml`,
  };
}
