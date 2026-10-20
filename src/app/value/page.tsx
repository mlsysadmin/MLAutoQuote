import Link from "next/link";
import type { Metadata } from "next";
import { MAKES_BY_REGION } from "@/lib/vehicles";
import { guidesForMake } from "@/lib/guides";
import { toSlug, breadcrumbJsonLd } from "@/lib/seo";
import { SiteHeader, SiteFooter, Breadcrumbs } from "@/components/SiteChrome";
import { ButtonLink } from "@/components/ui";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Car Values in the Philippines — What Is Your Car Worth?",
  description:
    "Indicative resale values for second-hand cars in the Philippines, by make, model and year. Free, updated from live marketplace asking prices, with no sign-up.",
  alternates: { canonical: "/value" },
  openGraph: {
    url: "/value",
    title: "What is your car worth? Philippine resale values by model",
    description:
      "Indicative second-hand car values by make, model and year — and a free cash offer from M Lhuillier.",
  },
};

export default function ValueIndexPage() {
  const regions = MAKES_BY_REGION.map((group) => ({
    region: group.region,
    makes: group.makes
      .map((make) => ({ make, count: guidesForMake(make).length }))
      .filter((m) => m.count > 0),
  })).filter((g) => g.makes.length > 0);

  const total = regions.reduce(
    (sum, g) => sum + g.makes.reduce((s, m) => s + m.count, 0),
    0,
  );

  return (
    <div className="min-h-dvh bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Car values", path: "/value" },
            ]),
          ),
        }}
      />
      <SiteHeader />

      <main id="main" className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <Breadcrumbs
            trail={[
              { name: "Home", path: "/" },
              { name: "Car values", path: "/value" },
            ]}
          />

          <h1 className="mt-4 text-3xl font-bold text-ink-800 sm:text-4xl">
            What is your car <span className="text-ml-red-500">worth</span>?
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-700">
            Indicative resale ranges for {total} models sold in the Philippines,
            broken down by model year. These are guides based on what similar
            units are advertised for — for a firm number on your actual car, we
            price it against live listings and an appraiser reviews it.
          </p>

          <div className="mt-6">
            <ButtonLink href="/sell" variant="cta" size="lg">
              Get a real offer for my car
            </ButtonLink>
          </div>

          <div className="mt-12 space-y-10">
            {regions.map((group) => (
              <section key={group.region}>
                <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">
                  {group.region} makes
                </h2>
                <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {group.makes.map(({ make, count }) => (
                    <li key={make}>
                      <Link
                        href={`/value/${toSlug(make)}`} prefetch={false}
                        className="block rounded-[20px] bg-white px-5 py-4 shadow-[0_4px_12px_rgb(0_0_0/0.08)] transition-shadow duration-200 hover:shadow-[0_10px_30px_rgb(0_0_0/0.15)]"
                      >
                        <span className="block font-semibold text-ink-900">
                          {make}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-500 nums">
                          {count} model{count === 1 ? "" : "s"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
