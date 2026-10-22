import { env } from "./env";

/**
 * Structured data.
 *
 * Everything here is built from our own constants — never from customer input —
 * so the JSON is safe to inline. Nothing is asserted that we can't stand
 * behind: no invented phone numbers, addresses, ratings or review counts, which
 * is also what keeps the markup inside Google's guidelines.
 */

const ORG_ID = `${env.appUrl}/#organisation`;
const SITE_ID = `${env.appUrl}/#website`;

export function organisationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    "@id": ORG_ID,
    name: "M Lhuillier AutoQuote",
    url: env.appUrl,
    parentOrganization: {
      "@type": "Organization",
      name: "M Lhuillier Financial Services",
      url: "https://mlhuillier.com",
    },
    areaServed: { "@type": "Country", name: "Philippines" },
    currenciesAccepted: "PHP",
    knowsLanguage: ["en-PH", "fil"],
    description:
      "M Lhuillier buys second-hand vehicles. Submit your car online and receive a cash offer reviewed by a licensed appraiser.",
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE_ID,
    url: env.appUrl,
    name: "M Lhuillier AutoQuote",
    inLanguage: "en-PH",
    publisher: { "@id": ORG_ID },
  };
}

/** Marks up the landing page's questions so they can win a rich result. */
export function faqJsonLd(items: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

/** The trail Google prints under a result instead of a raw URL. */
export function breadcrumbJsonLd(trail: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: step.name,
      item: `${env.appUrl}${step.path}`,
    })),
  };
}

/**
 * A vehicle value page. Deliberately *not* marked up as an Offer or a Product
 * with a price — these are indicative market ranges, not something we are
 * selling, and claiming otherwise would be both wrong and a structured-data
 * violation.
 */
export function vehicleGuideJsonLd(input: {
  make: string;
  model: string;
  path: string;
  description: string;
  bodyType: string;
  yearsSold: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${env.appUrl}${input.path}#page`,
    url: `${env.appUrl}${input.path}`,
    name: `${input.make} ${input.model} resale value in the Philippines`,
    description: input.description,
    inLanguage: "en-PH",
    isPartOf: { "@id": SITE_ID },
    publisher: { "@id": ORG_ID },
    about: {
      "@type": "Car",
      name: `${input.make} ${input.model}`,
      brand: { "@type": "Brand", name: input.make },
      model: input.model,
      bodyType: input.bodyType,
      vehicleModelDate: input.yearsSold,
    },
  };
}

/** Turns "Mercedes-Benz" / "Corolla Altis" into URL segments and back. */
export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function matchesSlug(value: string, slug: string): boolean {
  return toSlug(value) === slug;
}
