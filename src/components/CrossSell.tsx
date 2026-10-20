import type { ReactNode } from "react";

/**
 * Cross-sell into the rest of M Lhuillier.
 *
 * Placed only where the customer's situation makes the product genuinely
 * useful, never inside the wizard — interrupting someone mid-form to advertise
 * at them costs more in abandoned submissions than it could ever return.
 *
 * Every tile is a direct deep link to the live product page, so the path from
 * "I need cash" to the product is one tap. A server component: no JavaScript
 * ships for any of this.
 */

type Product = {
  key: string;
  name: string;
  blurb: string;
  href: string;
  icon: ReactNode;
};

const BASE = "https://mlhuillier.com";

function track(path: string, placement: string): string {
  // Lets the ML web team attribute traffic without us storing anything.
  return `${BASE}${path}?utm_source=autoquote&utm_medium=cross-sell&utm_campaign=${placement}`;
}

const ICONS = {
  pawn: (
    <path
      d="M12 3 4 8v8l8 5 8-5V8l-8-5Zm0 0v18M4 8l8 5 8-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  ),
  loan: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12.5" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3 9.5h18" stroke="currentColor" strokeWidth="1.7" />
    </>
  ),
  jewelry: (
    <path
      d="M8 3h8l4 6-8 12L4 9l4-6Zm0 0 4 6 4-6M4 9h16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  ),
  insurance: (
    <path
      d="M12 3.2 19 6v6c0 4.3-2.9 7.6-7 8.8-4.1-1.2-7-4.5-7-8.8V6l7-2.8Zm-2.6 8.6 2 2 4-4.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
};

function products(placement: string): Record<string, Product> {
  return {
    pawn: {
      key: "pawn",
      name: "Quick Cash Loan",
      blurb:
        "Pawn jewelry or a gadget and walk out with cash the same day. Over 3,000 branches nationwide.",
      href: track("/quick-cash-loans", placement),
      icon: ICONS.pawn,
    },
    loans: {
      key: "loans",
      name: "Salary & Car Loans",
      blurb: "Salary loans approved in about a minute. Car and home loans too.",
      href: track("/loans", placement),
      icon: ICONS.loan,
    },
    jewelry: {
      key: "jewelry",
      name: "ML Jewelry",
      blurb: "Certified gold and diamond pieces, with instalment options.",
      href: track("/jewelry", placement),
      icon: ICONS.jewelry,
    },
    insurance: {
      key: "insurance",
      name: "ML Insurance",
      blurb: "Cover your next vehicle, your home or your family from ₱300.",
      href: track("/ml-insurance", placement),
      icon: ICONS.insurance,
    },
  };
}

export type CrossSellPlacement =
  | "declined"
  | "accepted"
  | "waiting"
  | "landing";

/** What to show, and how to frame it, for each moment in the journey. */
const PLACEMENTS: Record<
  CrossSellPlacement,
  { title: string; lead: string; show: string[]; tone: "quiet" | "bold" }
> = {
  // They turned the offer down, so they still have the problem that brought
  // them here. This is the one placement that earns a prominent treatment.
  declined: {
    title: "Still need cash?",
    lead: "Keep the car and raise money against something else — most people walk out of a branch the same day.",
    show: ["pawn", "loans"],
    tone: "bold",
  },
  accepted: {
    title: "While you're with us",
    lead: "A few other things M Lhuillier can help with once the sale is done.",
    show: ["insurance", "loans", "jewelry"],
    tone: "quiet",
  },
  waiting: {
    title: "Need cash before your offer arrives?",
    lead: "Your appraiser usually comes back within a day. If you can't wait, a Quick Cash Loan takes minutes at any branch.",
    show: ["pawn"],
    tone: "quiet",
  },
  landing: {
    title: "More from M Lhuillier",
    lead: "Over 3,000 branches across the Philippines.",
    show: ["pawn", "loans", "jewelry", "insurance"],
    tone: "quiet",
  },
};

export function CrossSell({
  placement,
  className = "",
}: {
  placement: CrossSellPlacement;
  className?: string;
}) {
  const config = PLACEMENTS[placement];
  const catalogue = products(placement);
  const items = config.show.map((key) => catalogue[key]);
  const bold = config.tone === "bold";

  return (
    <section
      aria-labelledby={`cross-sell-${placement}`}
      // Charcoal rather than orange for the prominent variant: white on #333
      // clears 12.6:1, where white on the brand orange only works at display
      // sizes. The main site uses this same dark surface for its own panels.
      className={`rounded-[20px] p-6 sm:p-8 ${
        bold ? "bg-ink-800 text-white" : "bg-ink-100 text-ink-900"
      } ${className}`}
    >
      <h2
        id={`cross-sell-${placement}`}
        className="text-xl font-bold sm:text-2xl"
      >
        {config.title}
      </h2>
      <p
        className={`mt-1.5 max-w-xl text-sm leading-relaxed ${
          bold ? "text-white/90" : "text-ink-700"
        }`}
      >
        {config.lead}
      </p>

      <ul
        className={`mt-5 grid gap-3 ${
          items.length >= 4
            ? "sm:grid-cols-2 lg:grid-cols-4"
            : items.length === 3
              ? "sm:grid-cols-3"
              : items.length === 2
                ? "sm:grid-cols-2"
                : ""
        }`}
      >
        {items.map((product) => (
          <li key={product.key}>
            <a
              href={product.href}
              target="_blank"
              rel="noopener"
              className={`flex h-full items-start gap-3 rounded-2xl p-4 transition-colors ${
                bold
                  ? "bg-white/12 hover:bg-white/20"
                  : "bg-white ring-1 ring-ink-200 hover:ring-ink-300"
              }`}
            >
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                  bold ? "bg-ml-orange-500 text-white" : "bg-ml-orange-50 text-ml-orange-700"
                }`}
              >
                <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                  {product.icon}
                </svg>
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1 font-semibold">
                  {product.name}
                  <svg
                    viewBox="0 0 16 16"
                    className="size-3 shrink-0 opacity-60"
                    aria-hidden="true"
                  >
                    <path
                      d="M5.5 10.5 10.5 5.5M6.5 5.5h4v4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span
                  className={`mt-0.5 block text-xs leading-relaxed ${
                    bold ? "text-white/85" : "text-ink-600"
                  }`}
                >
                  {product.blurb}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      <p
        className={`mt-4 text-xs ${bold ? "text-white/70" : "text-ink-500"}`}
      >
        Opens mlhuillier.com in a new tab. Your submission stays as it is.
      </p>
    </section>
  );
}
