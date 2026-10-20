import Link from "next/link";
import { ButtonLink, Logo } from "@/components/ui";

export default function NotFound() {
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
        className="flex flex-1 items-center justify-center px-4 py-16"
      >
        <div className="max-w-md text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-ml-red-600">
            Page not found
          </p>
          <h1 className="mt-3 text-3xl font-extrabold text-ink-950">
            That link doesn&apos;t go anywhere
          </h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-600">
            Offer links expire and can only be opened once they&apos;ve been
            sent. If you were looking for your offer, find it with your
            reference code.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/track">Find my offer</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              Back to the start
            </ButtonLink>
          </div>
        </div>
      </main>
    </div>
  );
}
