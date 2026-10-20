import Link from "next/link";
import { ButtonLink, Logo } from "@/components/ui";

/**
 * Landing page.
 *
 * Fully static and server-rendered with no client JavaScript and no webfont or
 * image request, so the first thing a customer sees on a phone over mobile data
 * is the finished page rather than a spinner.
 */

export const dynamic = "force-static";

const STEPS = [
  {
    n: "01",
    title: "Tell us about your car",
    body: "Make, model, year and mileage. Takes about two minutes — we remember your answers if you stop halfway.",
  },
  {
    n: "02",
    title: "Upload photos and papers",
    body: "Eight guided shots plus your CR and OR. Your phone camera is all you need; we compress everything for you.",
  },
  {
    n: "03",
    title: "Get a reviewed offer",
    body: "We price your unit against live marketplace listings, a licensed appraiser checks it, and your offer arrives by SMS.",
  },
];

const CHECKLIST = [
  "Certificate of Registration (CR)",
  "Latest Official Receipt (OR)",
  "Your plate number or VIN",
  "The odometer reading",
];

const FAQ = [
  {
    q: "How is my offer calculated?",
    a: "We pull current asking prices for the same make, model and year from the public marketplace, strip out the obvious outliers, and work from the middle of that range. Your unit's mileage, condition and paperwork then move the number up or down — and you see every line of that maths on your offer.",
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
    q: "Is there any cost or obligation?",
    a: "None. Getting an offer is free, and you are under no obligation to accept it. The offer stays valid for seven days so you have time to decide.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-ink-200/60 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" aria-label="M Lhuillier AutoQuote home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/track"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-100"
            >
              Track my offer
            </Link>
            <ButtonLink href="/sell" size="sm" className="hidden sm:inline-flex">
              Get my offer
            </ButtonLink>
          </nav>
        </div>
      </header>

      <main id="main">
        {/* ── Hero ───────────────────────────────────────────────────── */}
        <section className="bg-ml-wash relative overflow-hidden border-b border-ink-200/60">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
            <div className="animate-rise">
              <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ml-red-700 ring-1 ring-ml-red-200">
                <span className="size-1.5 rounded-full bg-ml-red-500" />
                Free appraisal · No obligation
              </p>

              <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] text-ink-950 sm:text-5xl lg:text-6xl">
                Sell your car.
                <br />
                <span className="text-ml-red-600">Get a real offer</span> in 24
                hours.
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-700">
                Upload your details and photos once. We price your unit against
                live marketplace listings, a licensed appraiser reviews it, and
                you get a cash offer you can take to any M Lhuillier branch.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <ButtonLink href="/sell" size="lg" className="w-full sm:w-auto">
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
                  size="lg"
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  I already submitted
                </ButtonLink>
              </div>

              <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-ink-200 pt-6">
                {[
                  ["2 min", "to fill in"],
                  ["24 hrs", "to your offer"],
                  ["7 days", "offer validity"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="text-xl font-extrabold text-ink-900 nums sm:text-2xl">
                      {value}
                    </dt>
                    <dd className="mt-0.5 text-xs text-ink-600 sm:text-sm">
                      {label}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* The "what you'll need" card doubles as the hero's visual anchor.
                A concrete checklist reassures better than stock photography and
                costs nothing to load. */}
            <div className="animate-rise lg:justify-self-end">
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="bg-ml-gradient absolute -inset-3 rounded-[1.75rem] opacity-[0.12] blur-xl"
                />
                <div className="relative rounded-3xl bg-white p-6 shadow-[0_2px_6px_rgb(31_29_27/0.06),0_18px_44px_rgb(31_29_27/0.12)] ring-1 ring-ink-200/70 sm:p-8">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-ml-gold-100 text-ml-gold-800">
                      <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                        <path
                          d="M7 4h7l4 4v12H7V4Z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M13.5 4v4.5H18M9.5 13h5M9.5 16.5h5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-ink-900">
                        Have these ready
                      </h2>
                      <p className="text-sm text-ink-600">
                        Nothing else is needed
                      </p>
                    </div>
                  </div>

                  <ul className="mt-6 space-y-3">
                    {CHECKLIST.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-ml-red-600">
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

                  <p className="mt-6 rounded-xl bg-ink-50 px-4 py-3 text-xs leading-relaxed text-ink-600">
                    Missing a document? Submit anyway — we&apos;ll tell you what
                    it costs and how to sort it out.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ───────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-2xl font-extrabold text-ink-950 sm:text-3xl">
            Three steps, one sitting
          </h2>
          <p className="mt-2 max-w-2xl text-ink-600">
            No queues, no back-and-forth, no need to bring the car in before you
            know what it&apos;s worth.
          </p>

          <ol className="mt-10 grid gap-5 sm:grid-cols-3">
            {STEPS.map((step) => (
              <li
                key={step.n}
                className="group relative rounded-2xl bg-white p-6 ring-1 ring-ink-200/70 transition-shadow hover:shadow-[0_2px_6px_rgb(31_29_27/0.06),0_12px_32px_rgb(31_29_27/0.1)]"
              >
                <span className="text-sm font-black tracking-widest text-ml-red-500 nums">
                  {step.n}
                </span>
                <h3 className="mt-3 text-lg font-bold text-ink-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Transparency band ──────────────────────────────────────── */}
        <section className="bg-ml-gradient text-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-2xl font-extrabold sm:text-3xl">
                  You see the same prices our appraiser sees
                </h2>
                <p className="mt-4 max-w-xl leading-relaxed text-white/85">
                  Every offer comes with the lowest, middle and highest asking
                  price we found for a car like yours — with the links, so you
                  can open them yourself. No black box, no &ldquo;trust
                  us&rdquo;.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Lowest", tone: "bg-white/10" },
                  { label: "Middle", tone: "bg-ml-gold-400 text-ink-950" },
                  { label: "Highest", tone: "bg-white/10" },
                ].map((col, i) => (
                  <div
                    key={col.label}
                    className={`rounded-2xl px-4 py-6 text-center ring-1 ring-white/20 ${col.tone}`}
                  >
                    <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                      {col.label}
                    </p>
                    <div
                      aria-hidden="true"
                      className={`mx-auto mt-3 h-2 rounded-full ${
                        i === 1 ? "bg-ink-950/20" : "bg-white/25"
                      }`}
                      style={{ width: `${[55, 80, 65][i]}%` }}
                    />
                    <div
                      aria-hidden="true"
                      className={`mx-auto mt-2 h-2 rounded-full ${
                        i === 1 ? "bg-ink-950/20" : "bg-white/25"
                      }`}
                      style={{ width: `${[40, 60, 45][i]}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-2xl font-extrabold text-ink-950 sm:text-3xl">
            Questions people ask
          </h2>
          <div className="mt-8 divide-y divide-ink-200 border-y border-ink-200">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-left">
                  <span className="text-base font-semibold text-ink-900">
                    {item.q}
                  </span>
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

          <div className="mt-12 rounded-2xl bg-ink-900 px-6 py-8 text-center sm:px-10 sm:py-10">
            <h2 className="text-xl font-extrabold text-white sm:text-2xl">
              Find out what your car is worth
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/70">
              Two minutes now, a reviewed offer within a day.
            </p>
            <ButtonLink href="/sell" size="lg" className="mt-6">
              Start my appraisal
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-600">
            <Link href="/track" className="hover:text-ink-900">
              Track my offer
            </Link>
            <Link href="/staff/login" className="hover:text-ink-900">
              Staff sign in
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
