import { formatPeso } from "@/lib/money";

/**
 * A worked example of how an offer relates to the market.
 *
 * This replaced three cards of grey placeholder bars — a diagram of a diagram,
 * which told a visitor nothing. A price range is one continuous thing, so it is
 * drawn as one axis rather than three boxes, following the pattern used by
 * every valuation service that does this well.
 *
 * The honest part is that our offer sits *below* the asking range, and the
 * chart says so rather than cropping it out. Someone who discovers that on
 * their offer page instead would reasonably feel misled; someone who reads it
 * here, with the reason beside it, understands what they are being sold —
 * certainty today instead of a higher number in six weeks' time.
 *
 * Figures are illustrative and labelled as such. They are the real shape of a
 * real band, not invented round numbers.
 */

const EXAMPLE = {
  vehicle: "2019 Toyota Vios 1.3 E",
  mileage: "62,000 km",
  listings: 9,
  offer: 332_000,
  low: 349_000,
  mid: 408_000,
  high: 495_000,
};

// The axis runs from a little under our offer to a little over the top asking
// price, so every marker sits on the scale rather than off its end.
const AXIS_MIN = 310_000;
const AXIS_MAX = 525_000;

const at = (value: number) =>
  ((value - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * 100;

export function MarketRangeExample() {
  const low = at(EXAMPLE.low);
  const mid = at(EXAMPLE.mid);
  const high = at(EXAMPLE.high);
  const offer = at(EXAMPLE.offer);

  return (
    <figure className="rounded-[20px] bg-white p-5 text-ink-900 shadow-[0_18px_44px_rgb(31_29_27/0.18)] sm:p-7">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-base font-bold">{EXAMPLE.vehicle}</span>
        <span className="text-xs font-medium text-ink-500">
          {EXAMPLE.mileage} · {EXAMPLE.listings} listings found
        </span>
      </figcaption>

      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-ink-400">
        Example
      </p>

      {/* ── The axis ── */}
      <div className="relative mt-9 mb-2 h-3">
        {/* Full scale, faint: everything from our offer to the top asking price. */}
        <div className="absolute inset-0 rounded-full bg-ink-100" />

        {/* The asking range itself, picked out in the brand orange. */}
        <div
          className="absolute top-0 h-3 rounded-full bg-ml-orange-200"
          style={{ left: `${low}%`, width: `${high - low}%` }}
        />

        {/* Middle of the market. */}
        <Tick left={mid} tone="dark" label="Middle" value={EXAMPLE.mid} above />

        {/* The two ends of the asking range, labelled below to avoid collisions. */}
        <Tick left={low} tone="gold" label="Lowest asking" value={EXAMPLE.low} />
        <Tick left={high} tone="gold" label="Highest asking" value={EXAMPLE.high} />

        {/* Our offer. */}
        <span
          className="absolute -top-1.5 size-6 -translate-x-1/2 rounded-full bg-ml-red-600 ring-4 ring-white"
          style={{ left: `${offer}%` }}
          aria-hidden="true"
        />
      </div>

      {/* ── Our offer, spelled out ── */}
      <div className="mt-14 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ml-red-50 px-4 py-3.5 ring-1 ring-ml-red-100">
        <span className="flex items-center gap-2.5">
          <span className="size-3 shrink-0 rounded-full bg-ml-red-600" aria-hidden="true" />
          <span className="text-sm font-semibold text-ink-800">
            What we&apos;d offer
          </span>
        </span>
        <span className="text-xl font-extrabold text-ml-red-700 nums">
          {formatPeso(EXAMPLE.offer)}
        </span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-500">
        Asking prices are what sellers hope to get, not what cars sell for. Ours
        is cash today — no listing, no meet-ups, no waiting for a buyer who may
        not come.
      </p>
    </figure>
  );
}

/** A labelled point on the axis. */
function Tick({
  left,
  label,
  value,
  tone,
  above = false,
}: {
  left: number;
  label: string;
  value: number;
  tone: "dark" | "gold";
  above?: boolean;
}) {
  return (
    <span
      className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
      style={{ left: `${left}%` }}
    >
      {above ? (
        <span className="absolute bottom-5 flex flex-col items-center whitespace-nowrap">
          <span className="text-sm font-extrabold text-ink-900 nums">
            {formatPeso(value)}
          </span>
          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-ink-500">
            {label}
          </span>
        </span>
      ) : null}

      <span
        className={`size-3 rounded-full ring-2 ring-white ${
          tone === "dark" ? "bg-ink-900" : "bg-ml-orange-600"
        }`}
        aria-hidden="true"
      />

      {above ? null : (
        <span className="absolute top-5 flex flex-col items-center whitespace-nowrap">
          <span className="text-xs font-bold text-ink-800 nums">
            {formatPeso(value)}
          </span>
          <span className="text-[0.65rem] font-medium uppercase tracking-wider text-ink-400">
            {label}
          </span>
        </span>
      )}
    </span>
  );
}
