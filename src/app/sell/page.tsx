import type { Metadata } from "next";
import Link from "next/link";
import { Wizard } from "@/components/wizard/Wizard";
import { findSpec, MAKES } from "@/lib/vehicles";

export const metadata: Metadata = {
  title: "Get your offer",
  description:
    "Tell us about your car, upload a few photos, and get a reviewed cash offer from M Lhuillier.",
  // Crawlable but not indexed: this is an application screen, and the crawler
  // has to be able to reach it to see this directive at all.
  robots: { index: false, follow: true },
};

export default async function SellPage({
  searchParams,
}: {
  searchParams: Promise<{ make?: string; model?: string }>;
}) {
  const sp = await searchParams;

  // A revision deployed without DATABASE_URL serves this page perfectly well
  // and cannot save a word of it. Letting someone answer nine questions and
  // photograph their car before telling them is the worst possible order, so
  // the form is not offered at all. Checked from the environment rather than
  // by querying: it costs nothing, and this is the failure it catches.
  if (!process.env.DATABASE_URL) {
    return <Unavailable />;
  }

  // The value guides link here with a model already chosen. Validate against
  // the catalogue so a hand-edited URL can't seed nonsense into the form.
  const make = sp.make && MAKES.includes(sp.make) ? sp.make : null;
  const spec = make ? findSpec(make, sp.model ?? "") : null;

  return (
    <Wizard
      prefill={
        make
          ? { make, model: spec?.name ?? "", bodyType: spec?.body ?? "" }
          : undefined
      }
    />
  );
}

/**
 * Shown instead of the form when the service cannot store a submission.
 *
 * It says what is true — this is our problem, not theirs — and offers the one
 * thing that still works: a branch, and a phone. Nothing here asks them to
 * check their connection.
 */
function Unavailable() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-extrabold text-ink-950">
        We can&apos;t take submissions right now
      </h1>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-600">
        This is a problem at our end, not yours, and our team already knows.
        Please try again a little later — your car will still be worth what it
        was.
      </p>
      <p className="mt-6 text-sm leading-relaxed text-ink-600">
        In a hurry? Any of our{" "}
        <a
          href="https://mlhuillier.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-ml-red-700 underline underline-offset-2"
        >
          3,000 branches
        </a>{" "}
        can start an appraisal in person.
      </p>
      <Link
        href="/"
        className="mx-auto mt-8 rounded-full bg-ink-900 px-6 py-3 text-sm font-bold text-white"
      >
        Back to the homepage
      </Link>
    </main>
  );
}
