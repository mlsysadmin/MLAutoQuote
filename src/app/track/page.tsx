import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui";
import { TrackLookupForm } from "@/components/TrackLookupForm";

export const metadata: Metadata = {
  title: "Track my offer",
  description: "Find your M Lhuillier vehicle offer using your reference code.",
  robots: { index: false, follow: false },
};

export default function TrackPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
          <Link href="/" aria-label="M Lhuillier AutoQuote home">
            <Logo />
          </Link>
        </div>
      </header>

      <main
        id="main"
        className="flex flex-1 items-center justify-center px-4 py-12"
      >
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-extrabold text-ink-950">
            Find your offer
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            We texted you a link when your offer was ready — opening that is the
            quickest way back. Lost it? Enter your reference code and the mobile
            number you gave us.
          </p>

          <div className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-ink-200/70">
            <TrackLookupForm />
          </div>

          <p className="mt-6 text-center text-sm text-ink-600">
            Haven&apos;t submitted a car yet?{" "}
            <Link
              href="/sell"
              className="font-semibold text-ml-red-700 hover:underline"
            >
              Start here
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
