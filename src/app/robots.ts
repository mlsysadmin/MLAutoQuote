import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

// Rendered per request so it reflects APP_URL on the running service rather
// than whatever origin the image happened to be built with.
export const dynamic = "force-dynamic";

/**
 * The marketing and guide pages are indexable; anything that could expose a
 * customer's submission or the staff portal is not.
 *
 * `/sell` is crawlable on purpose even though it carries a noindex tag — a
 * disallowed URL can still be indexed without its content, because the crawler
 * never gets far enough to read the tag. `/track/` with the trailing slash
 * blocks the token links while leaving the public lookup page reachable.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/staff", "/api/", "/track/"],
      },
    ],
    sitemap: `${env.appUrl}/sitemap.xml`,
    host: env.appUrl,
  };
}
