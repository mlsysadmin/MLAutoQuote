
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
  icon: string;
};

const BASE = "https://mlhuillier.com";

function track(path: string, placement: string): string {
  // Lets the ML web team attribute traffic without us storing anything.
  return `${BASE}${path}?utm_source=autoquote&utm_medium=cross-sell&utm_campaign=${placement}`;
}

/**
 * M Lhuillier's own service icons, taken from the live site and rasterised to
 * 256px WebP. The originals are a flat colour circle wrapped around a
 * full-resolution embedded bitmap — 4.2 MB across the five — which would have
 * cost more to load than the rest of the page combined. These are the same
 * artwork at 42 KB for the set.
 *
 * Each already carries its own coloured circle, so they need no chip behind
 * them, and they are deliberately not recoloured: on the main site these read
 * as product marks, not as brand chrome.
 */
const ICONS = {
  prenda: "/brand/services/prenda.webp",
  salary: "/brand/services/salary.webp",
  carLoan: "/brand/services/car-loan.webp",
  shop: "/brand/services/ml-shop.webp",
  insurance: "/brand/services/insurance.webp",
} as const;

function products(placement: string): Record<string, Product> {
  return {
    pawn: {
      key: "pawn",
      name: "Quick Cash Loan",
      blurb:
        "Pawn jewelry or a gadget and walk out with cash the same day. Over 3,000 branches nationwide.",
      href: track("/quick-cash-loans", placement),
      icon: ICONS.salary,
    },
    loans: {
      key: "loans",
      name: "Salary & Car Loans",
      blurb: "Salary loans approved in about a minute. Car and home loans too.",
      href: track("/loans", placement),
      icon: ICONS.carLoan,
    },
    shop: {
      key: "shop",
      // Named and pointed as mlhuillier.com has it: the homepage tile says
      // "ML Shop" and goes to /shop, which is the storefront. /jewelry is a
      // different page — the Jewellers brand site.
      name: "ML Shop",
      blurb:
        "Gold and diamond pieces from the country’s largest jewelry shop, with instalment options.",
      href: track("/shop", placement),
      icon: ICONS.shop,
    },
    insurance: {
      key: "insurance",
      name: "ML Insurance",
      blurb: "Cover your next vehicle, your home or your family from ₱300.",
      href: track("/ml-insurance", placement),
      icon: ICONS.insurance,
    },
    renewal: {
      key: "renewal",
      // /prenda, not /prenda-renewal — and it is missing from the sitemap, so
      // it will not turn up by crawling. The page is titled "Online Pawn
      // Ticket Renewal".
      name: "Prenda Renewal",
      blurb:
        "Renew your pawn online, anytime, without needing to visit a branch.",
      href: track("/prenda", placement),
      icon: ICONS.prenda,
    },
  };
}

export type CrossSellPlacement =
  | "declined"
  | "accepted"
  | "waiting"
  | "landing";

/** One column per card up to five, so a row never leaves an orphan. */
const COLUMNS: Record<number, string> = {
  1: "",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-2 lg:grid-cols-5",
};

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
    show: ["insurance", "loans", "shop"],
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
    show: ["pawn", "loans", "shop", "insurance", "renewal"],
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
        className={`mt-5 grid gap-3 ${COLUMNS[Math.min(items.length, 5)]}`}
      >
        {items.map((product) => (
          <li key={product.key}>
            <a
              href={product.href}
              target="_blank"
              rel="noopener"
              className={`flex h-full flex-col items-start gap-2.5 rounded-2xl p-4 transition-colors ${
                bold
                  ? "bg-white/12 hover:bg-white/20"
                  : "bg-white ring-1 ring-ink-200 hover:ring-ink-300"
              }`}
            >
              {/* next/image would add a runtime optimiser for nothing: these are
                  local, fixed-size, already-compressed 256px WebP. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.icon}
                alt=""
                width={64}
                height={64}
                loading="lazy"
                decoding="async"
                className="size-16 object-contain"
              />
              <span className="min-w-0">
                <span className="flex items-start gap-1 font-semibold leading-snug">
                  {product.name}
                  <svg
                    viewBox="0 0 16 16"
                    className="mt-[3px] size-3 shrink-0 opacity-60"
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
