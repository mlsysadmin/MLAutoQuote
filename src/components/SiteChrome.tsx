import Link from "next/link";
import { ButtonLink, Logo } from "@/components/ui";

/**
 * Header and footer for the public, crawlable pages.
 *
 * Server components with no state, so none of this reaches the client bundle.
 */

export function SiteHeader() {
  return (
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
            href="/value"
            className="hidden rounded-full px-3 py-2 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-100 sm:inline-block"
          >
            Car values
          </Link>
          {/* min-h-11 (44px) rather than padding alone: at text-sm the padded
              height came out 36px, under what a thumb reliably hits. These
              customers are one-handed on a phone, often stood next to the
              car they are selling. */}
          <Link
            href="/track"
            prefetch={false}
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-100"
          >
            Track
            <span className="hidden sm:inline"> offer</span>
          </Link>
          <ButtonLink
            href="/sell"
            variant="cta"
            size="lg"
            className="!min-h-0 !px-6 !py-2.5 !text-[0.9375rem]"
          >
            Get my offer
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
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
  );
}

/** The crumb trail shown above a guide's heading. */
export function Breadcrumbs({
  trail,
}: {
  trail: Array<{ name: string; path: string }>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-ink-600">
      <ol className="flex flex-wrap items-center gap-1.5">
        {trail.map((step, i) => (
          <li key={step.path} className="flex items-center gap-1.5">
            {i > 0 ? (
              <span aria-hidden="true" className="text-ink-400">
                /
              </span>
            ) : null}
            {i === trail.length - 1 ? (
              <span className="font-medium text-ink-900">{step.name}</span>
            ) : (
              <Link href={step.path} className="hover:text-ink-900 hover:underline">
                {step.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
