import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  allGuides,
  bodyLabel,
  findGuide,
  guidesForMake,
  valuesForGuide,
  yearsSoldLabel,
} from "@/lib/guides";
import { formatPeso } from "@/lib/money";
import { toSlug, breadcrumbJsonLd, vehicleGuideJsonLd } from "@/lib/seo";
import { marketplaceSearchUrl } from "@/lib/valuation/providers/marketplace";
import { SiteHeader, SiteFooter, Breadcrumbs } from "@/components/SiteChrome";
import { ButtonLink } from "@/components/ui";
import { CrossSell } from "@/components/CrossSell";

export const dynamic = "force-static";

type Params = { params: Promise<{ make: string; model: string }> };

export function generateStaticParams() {
  return allGuides().map((guide) => ({
    make: toSlug(guide.make),
    model: toSlug(guide.model),
  }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { make, model } = await params;
  const guide = findGuide(make, model);
  if (!guide) return {};

  const values = valuesForGuide(guide);
  const newest = values[0];
  const range = newest
    ? ` Prices from ${formatPeso(values[values.length - 1].low)} to ${formatPeso(newest.high)}.`
    : "";

  return {
    title: `${guide.make} ${guide.model} Resale Value Philippines (${yearsSoldLabel(guide.spec)})`,
    description: `How much is a second-hand ${guide.make} ${guide.model} worth in the Philippines?${range} Year-by-year resale ranges, what moves the price, and a free cash offer.`,
    alternates: { canonical: guide.path },
    openGraph: {
      url: guide.path,
      title: `${guide.make} ${guide.model} resale value in the Philippines`,
      description: `Year-by-year second-hand prices for the ${guide.make} ${guide.model}.`,
    },
  };
}

export default async function ModelGuidePage({ params }: Params) {
  const { make: makeSlug, model: modelSlug } = await params;
  const guide = findGuide(makeSlug, modelSlug);
  if (!guide) notFound();

  const values = valuesForGuide(guide);
  if (values.length === 0) notFound();

  const body = bodyLabel(guide.spec.body);
  const years = yearsSoldLabel(guide.spec);
  const newest = values[0];
  const oldest = values[values.length - 1];
  const siblings = guidesForMake(guide.make)
    .filter((g) => g.model !== guide.model)
    .slice(0, 6);

  const trail = [
    { name: "Home", path: "/" },
    { name: "Car values", path: "/value" },
    { name: guide.make, path: `/value/${makeSlug}` },
    { name: guide.model, path: guide.path },
  ];

  const description = `Indicative resale values for the ${guide.make} ${guide.model} in the Philippines, by model year, from ${formatPeso(oldest.low)} to ${formatPeso(newest.high)}.`;

  // Roughly how much a year of age costs on this nameplate — the number people
  // are really asking about when they ask what their car is worth.
  const yearlyDrop =
    values.length > 1
      ? Math.round((newest.mid - oldest.mid) / (values.length - 1))
      : null;

  return (
    <div className="min-h-dvh bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbJsonLd(trail),
            vehicleGuideJsonLd({
              make: guide.make,
              model: guide.model,
              path: guide.path,
              description,
              bodyType: body,
              yearsSold: years,
            }),
          ]),
        }}
      />
      <SiteHeader />

      <main id="main" className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-4xl">
          <Breadcrumbs trail={trail} />

          <h1 className="mt-4 text-3xl font-bold text-ink-800 sm:text-4xl">
            {guide.make} {guide.model}{" "}
            <span className="text-ml-red-500">resale value</span>
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-700">
            A {years} {body}. A used {guide.make} {guide.model} in the
            Philippines typically advertises between{" "}
            <strong className="font-semibold text-ink-900">
              {formatPeso(oldest.low)}
            </strong>{" "}
            and{" "}
            <strong className="font-semibold text-ink-900">
              {formatPeso(newest.high)}
            </strong>
            , depending on the model year and condition.
            {yearlyDrop && yearlyDrop > 0
              ? ` Each year of age costs roughly ${formatPeso(yearlyDrop)} across this range.`
              : ""}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/sell" variant="cta" size="lg">
              Get a real offer for mine
            </ButtonLink>
            <ButtonLink
              href={`/sell?make=${encodeURIComponent(guide.make)}&model=${encodeURIComponent(guide.model)}`}
              variant="secondary"
              size="lg"
            >
              Start with this model
            </ButtonLink>
          </div>

          {/* ── Year table ─────────────────────────────────────────── */}
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-ink-900">
              {guide.make} {guide.model} price by year
            </h2>
            <p className="mt-2 text-sm text-ink-600">
              Typical asking range for a unit in average condition with average
              mileage for its age.
            </p>

            <div className="mt-5 overflow-hidden rounded-[20px] bg-white shadow-[0_4px_12px_rgb(0_0_0/0.08)]">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Indicative resale value of the {guide.make} {guide.model} by
                  model year
                </caption>
                <thead>
                  <tr className="border-b border-ink-200/70 bg-ink-100/60 text-left">
                    <th scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-ink-500 sm:px-5">
                      Year
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-ink-500 sm:px-5">
                      Low
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-ink-500 sm:px-5">
                      Typical
                    </th>
                    <th scope="col" className="hidden px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-ink-500 sm:table-cell sm:px-5">
                      High
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200/70">
                  {values.map((value) => (
                    <tr key={value.year}>
                      <th scope="row" className="px-4 py-3 text-left font-semibold text-ink-900 nums sm:px-5">
                        {value.year}
                      </th>
                      <td className="px-4 py-3 text-right text-ink-600 nums sm:px-5">
                        {formatPeso(value.low)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-ink-900 nums sm:px-5">
                        {formatPeso(value.mid)}
                      </td>
                      <td className="hidden px-4 py-3 text-right text-ink-600 nums sm:table-cell sm:px-5">
                        {formatPeso(value.high)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-ink-500">
              Guides, not offers. Check what sellers are asking right now on{" "}
              <a
                href={marketplaceSearchUrl({
                  make: guide.make,
                  model: guide.model,
                  year: newest.year,
                })}
                target="_blank"
                rel="noopener nofollow"
                className="font-semibold text-ml-orange-700 hover:underline"
              >
                the live marketplace
              </a>
              .
            </p>
          </section>

          {/* ── What moves the price ───────────────────────────────── */}
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-ink-900">
              What changes what your {guide.model} is worth
            </h2>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                {
                  t: "Mileage against its age",
                  d: "We work from about 15,000 km a year. Well under that lifts the price; well over it brings the price down, up to a limit.",
                },
                {
                  t: "Condition and history",
                  d: "Accident repairs reduce the value; flood history reduces it sharply. Warning lights, worn tyres and a weak aircon each carry a set allowance.",
                },
                {
                  t: "Paperwork",
                  d: "A clean CR in your own name is worth real money. A missing CR, lapsed registration or an annotated mortgage all cost time and fees.",
                },
                {
                  t: "Demand right now",
                  d: `${body === "pickup" || body === "SUV" ? "Diesel SUVs and pickups" : "This segment"} moves with fuel prices and the season, which is why we price against live listings rather than a fixed table.`,
                },
              ].map((item) => (
                <div
                  key={item.t}
                  className="rounded-[20px] bg-white p-5 shadow-[0_4px_12px_rgb(0_0_0/0.08)]"
                >
                  <dt className="font-semibold text-ink-900">{item.t}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-ink-600">
                    {item.d}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {siblings.length > 0 ? (
            <section className="mt-12">
              <h2 className="text-lg font-bold text-ink-900">
                Other {guide.make} models
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {siblings.map((sibling) => (
                  <li key={sibling.path}>
                    <Link
                      href={sibling.path}
                      prefetch={false}
                      className="inline-block rounded-full bg-ink-100 px-4 py-2 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-200"
                    >
                      {sibling.model}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="mt-12">
            <CrossSell placement="landing" />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
