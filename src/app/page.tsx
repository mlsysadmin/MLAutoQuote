import Link from "next/link";
import type { Metadata } from "next";
import { Brand, ButtonLink, Logo } from "@/components/ui";
import { CrossSell } from "@/components/CrossSell";
import { faqJsonLd } from "@/lib/seo";
import { POPULAR_GUIDES } from "@/lib/guides";

/**
 * Landing page.
 *
 * Static, with no client JavaScript and no image requests — on a mid-range
 * phone over mobile data the first paint is the finished page. The section
 * rhythm (white, grey, orange band) and the pill buttons follow mlhuillier.com.
 */

export const dynamic = "force-static";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const STEPS = [
  {
    n: "1",
    title: "Tell us about your car",
    body: "Make, year, model and mileage. About a minute, and we remember your answers if you stop halfway.",
  },
  {
    n: "2",
    title: "Add photos and papers",
    body: "Five photos from your phone. We shrink each one before it uploads, so it works on mobile data.",
  },
  {
    n: "3",
    title: "Get a reviewed offer",
    body: "We price it against live marketplace listings, a licensed appraiser checks it, and your offer arrives by SMS.",
  },
];

const FAQ = [
  {
    q: "How much is my car worth?",
    a: "We pull current asking prices for the same make, model and year from the public marketplace, strip out the obvious outliers, and work from the middle of that range. Your unit's mileage, condition and paperwork then move the number up or down — and you see every line of that maths on your offer.",
  },
  {
    q: "How long does it take to get an offer?",
    a: "The form takes about four minutes. Your offer usually arrives within 24 hours, and we text you a link the moment the appraiser releases it.",
  },
  {
    q: "Does a person actually look at it?",
    a: "Yes. The system prepares a proposed offer, but nothing reaches you until one of our appraisers has reviewed your photos and the comparable listings, and either confirmed or adjusted the number.",
  },
  {
    q: "What if my car is still under financing?",
    a: "That's fine. Tell us the remaining balance in the form and we settle it directly with your financing company out of the purchase price — you receive the difference.",
  },
  {
    q: "What documents do I need to sell my car?",
    a: "Your Certificate of Registration, your latest Official Receipt, and a government ID. If something is missing you can still submit — we'll tell you what it costs to replace and factor it into the offer.",
  },
  {
    q: "Is there any cost or obligation?",
    a: "None. Getting an offer is free and you are under no obligation to accept it. The offer stays valid for seven days so you have time to decide.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-white">
      {/* FAQ markup, so these answers can win a rich result. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(FAQ)) }}
      />

      <header className="sticky top-0 z-30 border-b border-ink-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a
            href="https://www.mlhuillier.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="M Lhuillier home (opens in a new tab)"
          >
            <Logo />
          </a>
          <nav className="flex items-center gap-1">
            <Link
              href="/track"
              prefetch={false}
              className="whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-100 sm:px-3"
            >
              Track
              <span className="hidden sm:inline"> offer</span>
            </Link>
            <ButtonLink href="/sell" variant="cta" size="lg" className="!px-6 !py-2.5 !min-h-0 !text-[0.9375rem]">
              Get my offer
            </ButtonLink>
          </nav>
        </div>
      </header>

      <main id="main">
        {/* ── Hero ───────────────────────────────────────────────────── */}
        <section className="px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-16">
          <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-ml-red-50 px-3.5 py-1.5 text-xs font-semibold text-ml-red-800">
                <span className="size-1.5 rounded-full bg-ml-red-500" />
                Free appraisal · No obligation
              </p>

              <h1 className="mt-5 text-[2.1rem] font-bold leading-[1.1] text-ink-800 sm:text-5xl lg:text-[3.4rem]">
                Sell your car.{" "}
                <span className="text-ml-red-500">Get a real offer</span> in 24
                hours.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-700 sm:text-lg">
                Upload your details and photos once. We price your car against
                live marketplace listings, a licensed appraiser reviews it, and
                you get a cash offer you can take to any <Brand /> branch.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/sell" variant="cta" size="lg" className="w-full sm:w-auto">
                  Get my offer — it&apos;s free
                  <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
                    <path
                      d="M4 10h11m0 0-4-4m4 4-4 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </ButtonLink>
                <ButtonLink
                  href="/track"
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  I already submitted
                </ButtonLink>
              </div>

              <dl className="mt-9 grid grid-cols-3 gap-3 border-t border-ink-200 pt-6">
                {[
                  ["4 min", "to fill in"],
                  ["24 hrs", "to your offer"],
                  ["7 days", "offer validity"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="text-xl font-bold text-ink-900 nums sm:text-2xl">
                      {value}
                    </dt>
                    <dd className="mt-0.5 text-xs text-ink-600 sm:text-sm">
                      {label}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* A concrete checklist reassures better than stock photography,
                and costs nothing to load. */}
            <div className="mt-10 lg:mt-0 lg:justify-self-end">
              <div className="rounded-[20px] bg-white p-6 shadow-[0_10px_30px_rgb(0_0_0/0.15)] sm:p-8">
                <h2 className="text-lg font-bold text-ink-900">
                  Have these ready
                </h2>
                <p className="mt-0.5 text-sm text-ink-600">Nothing else needed</p>

                <ul className="mt-5 space-y-3">
                  {[
                    "Certificate of Registration (CR)",
                    "A government ID",
                    "Your plate number",
                    "The odometer reading",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-ml-red-500">
                        <svg
                          viewBox="0 0 16 16"
                          className="size-3 text-white"
                          aria-hidden="true"
                        >
                          <path
                            d="m3.5 8.5 3 3 6-7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <span className="text-sm font-medium text-ink-800">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>

                <p className="mt-5 rounded-2xl bg-ink-100 px-4 py-3 text-xs leading-relaxed text-ink-600">
                  Missing a document? Submit anyway — we&apos;ll tell you what it
                  costs and how to sort it out.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ───────────────────────────────────────────── */}
        <section className="bg-ink-100 px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">
              Three steps, one sitting
            </h2>
            <p className="mt-2 max-w-2xl text-ink-700">
              No queues, no haggling, and no need to bring the car in before you
              know what it&apos;s worth.
            </p>

            <ol className="mt-8 grid gap-4 sm:grid-cols-3">
              {STEPS.map((step) => (
                <li
                  key={step.n}
                  className="rounded-[20px] bg-white p-6 shadow-[0_4px_12px_rgb(0_0_0/0.08)] transition-shadow duration-200 hover:shadow-[0_10px_30px_rgb(0_0_0/0.15)]"
                >
                  <span className="flex size-9 items-center justify-center rounded-full bg-ml-red-500 text-sm font-bold text-white nums">
                    {step.n}
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-ink-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Transparency ───────────────────────────────────────────── */}
        <section className="bg-ml-red-500 px-4 py-14 text-white sm:px-6 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">
                You see the same prices our appraiser sees
              </h2>
              <p className="mt-4 max-w-xl leading-relaxed text-white/90">
                Every offer comes with the lowest, middle and highest asking
                price we found for a car like yours — with the links, so you can
                open them yourself. No black box.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {["Lowest", "Middle", "Highest"].map((label, i) => (
                <div
                  key={label}
                  className={`rounded-[20px] px-3 py-6 text-center ${
                    i === 1 ? "bg-white text-ink-900" : "bg-white/15"
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                    {label}
                  </p>
                  <div
                    aria-hidden="true"
                    className={`mx-auto mt-3 h-2 rounded-full ${
                      i === 1 ? "bg-ink-200" : "bg-white/30"
                    }`}
                    style={{ width: `${[55, 80, 65][i]}%` }}
                  />
                  <div
                    aria-hidden="true"
                    className={`mx-auto mt-2 h-2 rounded-full ${
                      i === 1 ? "bg-ink-200" : "bg-white/30"
                    }`}
                    style={{ width: `${[40, 60, 45][i]}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Value guides: the crawlable surface ────────────────────── */}
        <section className="px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">
              What&apos;s your car worth?
            </h2>
            <p className="mt-2 max-w-2xl text-ink-700">
              Indicative resale ranges for the models we see most, by year.
            </p>

            <ul className="mt-6 flex flex-wrap gap-2">
              {POPULAR_GUIDES.map((guide) => (
                <li key={guide.href}>
                  <Link
                    href={guide.href} prefetch={false}
                    className="inline-block rounded-full bg-ink-100 px-4 py-2 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-200"
                  >
                    {guide.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/value"
                  prefetch={false}
                  className="inline-block rounded-full px-4 py-2 text-sm font-semibold text-ml-red-700 hover:underline"
                >
                  All makes →
                </Link>
              </li>
            </ul>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────────── */}
        <section className="bg-ink-100 px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-ink-900 sm:text-3xl">
              Questions people ask
            </h2>

            <div className="mt-7 space-y-3">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-[20px] bg-white px-5 py-4 shadow-[0_4px_12px_rgb(0_0_0/0.08)]"
                >
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                    <h3 className="text-base font-semibold text-ink-900">
                      {item.q}
                    </h3>
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-600 transition-transform group-open:rotate-45">
                      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
                        <path
                          d="M8 3v10M3 8h10"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </summary>
                  <p className="mt-3 pr-10 text-sm leading-relaxed text-ink-600">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Cross-sell ─────────────────────────────────────────────── */}
        <section className="px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <CrossSell placement="landing" />
          </div>
        </section>

        {/* ── Closing CTA ────────────────────────────────────────────── */}
        <section className="px-4 pb-16 sm:px-6">
          <div className="mx-auto max-w-6xl rounded-[20px] bg-ink-800 px-6 py-10 text-center sm:px-10 sm:py-14">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Find out what your car is worth
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/70">
              Four minutes now, a reviewed offer within a day.
            </p>
            <div className="mt-7">
              <ButtonLink href="/sell" variant="cta" size="lg">
                Start my appraisal
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-600">
            <Link href="/value" className="hover:text-ink-900">
              Car values
            </Link>
            <Link href="/track" className="hover:text-ink-900">
              Track my offer
            </Link>
            <a
              href="https://mlhuillier.com/branches"
              target="_blank"
              rel="noopener"
              className="hover:text-ink-900"
            >
              Branches
            </a>
            <Link href="/staff/login" className="hover:text-ink-900">
              Staff
            </Link>
            <span className="text-ink-400">
              © {new Date().getFullYear()} M Lhuillier
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
