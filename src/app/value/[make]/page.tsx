import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MAKES } from "@/lib/vehicles";
import {
  bodyLabel,
  findMake,
  guidesForMake,
  valueForYear,
  yearsSoldLabel,
} from "@/lib/guides";
import { formatPeso } from "@/lib/money";
import { toSlug, breadcrumbJsonLd } from "@/lib/seo";
import { SiteHeader, SiteFooter, Breadcrumbs } from "@/components/SiteChrome";
import { ButtonLink } from "@/components/ui";

export const dynamic = "force-static";

type Params = { params: Promise<{ make: string }> };

export function generateStaticParams() {
  return MAKES.filter((make) => guidesForMake(make).length > 0).map((make) => ({
    make: toSlug(make),
  }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { make: slug } = await params;
  const make = findMake(slug);
  if (!make) return {};

  const count = guidesForMake(make).length;
  return {
    title: `${make} Resale Values Philippines — Price by Model & Year`,
    description: `What a second-hand ${make} is worth in the Philippines. Indicative resale ranges for ${count} models by year, plus a free cash offer from M Lhuillier.`,
    alternates: { canonical: `/value/${slug}` },
    openGraph: {
      url: `/value/${slug}`,
      title: `${make} resale values in the Philippines`,
      description: `Indicative second-hand ${make} prices by model and year.`,
    },
  };
}

export default async function MakePage({ params }: Params) {
  const { make: slug } = await params;
  const make = findMake(slug);
  if (!make) notFound();

  const guides = guidesForMake(make);
  if (guides.length === 0) notFound();

  const currentYear = new Date().getFullYear();
  const trail = [
    { name: "Home", path: "/" },
    { name: "Car values", path: "/value" },
    { name: make, path: `/value/${slug}` },
  ];

  return (
    <div className="min-h-dvh bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd(trail)),
        }}
      />
      <SiteHeader />

      <main id="main" className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-5xl">
          <Breadcrumbs trail={trail} />

          <h1 className="mt-4 text-3xl font-bold text-ink-800 sm:text-4xl">
            {make} resale values
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-700">
            What a second-hand {make} is worth in the Philippines today. Pick a
            model for a year-by-year breakdown, or get a firm offer on your own
            car in about four minutes.
          </p>

          <div className="mt-6">
            <ButtonLink href="/sell" variant="cta" size="lg">
              Get a real offer for my {make}
            </ButtonLink>
          </div>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {guides.map((guide) => {
              // A recent year gives the headline figure; older years are on
              // the model's own page.
              const sample = Math.min(
                guide.spec.to ?? currentYear,
                currentYear - 3,
              );
              const value = valueForYear(make, guide.model, sample);

              return (
                <li key={guide.path}>
                  <Link
                    href={guide.path}
                    className="flex h-full items-start justify-between gap-4 rounded-[20px] bg-white px-5 py-4 shadow-[0_4px_12px_rgb(0_0_0/0.08)] transition-shadow duration-200 hover:shadow-[0_10px_30px_rgb(0_0_0/0.15)]"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink-900">
                        {make} {guide.model}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-500">
                        {bodyLabel(guide.spec.body)} ·{" "}
                        {yearsSoldLabel(guide.spec)}
                      </span>
                    </span>
                    {value ? (
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-bold text-ink-900 nums">
                          {formatPeso(value.mid)}
                        </span>
                        <span className="mt-0.5 block text-[0.7rem] text-ink-500 nums">
                          {sample} model
                        </span>
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="mt-8 rounded-[20px] bg-ink-100 px-5 py-4 text-xs leading-relaxed text-ink-600">
            Figures are indicative mid-market asking prices for a unit in average
            condition with average mileage, not offers. What we actually pay
            depends on condition, mileage, paperwork and current demand — which
            is what the appraisal is for.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
