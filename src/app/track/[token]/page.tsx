import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatPeso, formatKm } from "@/lib/money";
import type { OfferBreakdown } from "@/lib/valuation";
import { Logo, Badge } from "@/components/ui";
import { OfferResponse } from "@/components/OfferResponse";
import { CrossSell } from "@/components/CrossSell";

export const metadata: Metadata = {
  title: "Your offer",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export default async function TrackPage({ params }: Params) {
  const { token } = await params;

  const submission = await prisma.submission.findUnique({
    where: { publicToken: token },
    select: {
      id: true,
      refCode: true,
      status: true,
      make: true,
      model: true,
      year: true,
      variant: true,
      mileageKm: true,
      customerName: true,
      submittedAt: true,
      createdAt: true,
      preferredBranch: true,
      comparables: {
        where: { isExcluded: false, bucket: { not: null } },
        orderBy: { pricePhp: "asc" },
      },
      offers: {
        where: { status: { in: ["SENT", "ACCEPTED", "DECLINED", "EXPIRED"] } },
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  if (!submission) notFound();

  const offer = submission.offers[0] ?? null;
  const vehicle =
    [submission.year, submission.make, submission.model]
      .filter(Boolean)
      .join(" ") || "your vehicle";
  const firstName = (submission.customerName ?? "").split(" ")[0];

  // Record the first customer view, once.
  if (offer && offer.status === "SENT") {
    const seen = await prisma.offerEvent.findFirst({
      where: { offerId: offer.id, type: "VIEWED_BY_CUSTOMER" },
      select: { id: true },
    });
    if (!seen) {
      await prisma.offerEvent.create({
        data: { offerId: offer.id, type: "VIEWED_BY_CUSTOMER" },
      });
    }
  }

  const expired =
    offer?.status === "EXPIRED" ||
    (offer?.status === "SENT" &&
      offer.validUntil !== null &&
      offer.validUntil < new Date());

  return (
    <div className="min-h-dvh bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a
            href="https://www.mlhuillier.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="M Lhuillier home (opens in a new tab)"
          >
            <Logo />
          </a>
          <span className="font-mono text-xs font-bold text-ink-500">
            {submission.refCode}
          </span>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {!offer || !["SENT", "ACCEPTED", "DECLINED"].includes(offer.status) ? (
          <PendingState
            vehicle={vehicle}
            firstName={firstName}
            refCode={submission.refCode}
            submittedAt={submission.submittedAt ?? submission.createdAt}
            status={submission.status}
          />
        ) : (
          <>
            <div className="animate-rise">
              <p className="text-sm font-semibold text-ink-600">
                {firstName ? `${firstName}, here's` : "Here's"} your offer for
              </p>
              <h1 className="mt-1 text-2xl font-extrabold text-ink-950 sm:text-3xl">
                {vehicle}
              </h1>
              <p className="mt-1 text-sm text-ink-600">
                {[submission.variant, formatKm(submission.mileageKm)]
                  .filter((v) => v && v !== "—")
                  .join(" · ")}
              </p>
            </div>

            {/* ── The number ─────────────────────────────────────────── */}
            {/* The brand's accent surface, carrying the one number the
                customer came for. */}
            <div className="animate-rise mt-6 overflow-hidden rounded-[20px] bg-ml-red-500 text-white shadow-[0_10px_30px_rgb(255_95_0/0.3)]">
              {/* Only the figure is big enough for white on orange to clear
                  contrast. The supporting lines are solid white at a larger
                  size, and the appraiser's message — a full paragraph — sits
                  on white where it can be read properly. */}
              <div className="px-6 py-8 text-center sm:px-10 sm:py-10">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-white">
                  Our offer
                </p>
                <p className="mt-2 text-5xl font-extrabold tracking-tight nums sm:text-6xl">
                  {formatPeso(offer.finalOfferPhp ?? offer.systemOfferPhp)}
                </p>
                {offer.validUntil ? (
                  <p className="mt-3 text-base font-semibold text-white">
                    {expired ? "Expired on " : "Valid until "}
                    {offer.validUntil.toLocaleDateString("en-PH", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                ) : null}
              </div>

              {offer.customerMessage ? (
                <div className="bg-white px-6 py-4 sm:px-10">
                  <p className="text-sm leading-relaxed text-ink-800">
                    {offer.customerMessage}
                  </p>
                </div>
              ) : null}
            </div>

            {offer.status === "SENT" && !expired ? (
              <div className="mt-6">
                <OfferResponse token={token} />
              </div>
            ) : (
              <ResponseState status={offer.status} expired={expired} />
            )}

            {/* ── What we compared against ───────────────────────────── */}
            {submission.comparables.length > 0 ? (
              <section className="mt-10">
                <h2 className="text-lg font-extrabold text-ink-950">
                  What similar cars are listed for
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-600">
                  These are the asking prices we priced against. Open any of
                  them — we have nothing to hide.
                </p>

                <ul className="mt-5 space-y-3">
                  {["LOW", "MID", "HIGH"].map((bucket) => {
                    const comp = submission.comparables.find(
                      (c) => c.bucket === bucket,
                    );
                    if (!comp) return null;
                    const label =
                      bucket === "LOW"
                        ? "Lowest asking"
                        : bucket === "MID"
                          ? "Middle of the market"
                          : "Highest asking";

                    return (
                      <li key={bucket}>
                        <a
                          href={comp.url}
                          target="_blank"
                          rel="noreferrer nofollow"
                          className={`flex items-center justify-between gap-4 rounded-2xl bg-white px-5 py-4 ring-1 transition-shadow hover:shadow-md ${
                            bucket === "MID"
                              ? "ring-2 ring-ml-red-400"
                              : "ring-ink-200/70"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wider text-ink-500">
                              {label}
                            </p>
                            <p className="mt-0.5 truncate text-sm font-semibold text-ink-900">
                              {comp.title}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-ink-500">
                              {[comp.year, formatKm(comp.mileageKm), comp.location]
                                .filter((v) => v && v !== "—")
                                .join(" · ")}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-lg font-extrabold text-ink-950 nums">
                              {formatPeso(comp.pricePhp)}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-ml-red-600">
                              View listing →
                            </p>
                          </div>
                        </a>
                      </li>
                    );
                  })}
                </ul>

                <p className="mt-4 text-xs leading-relaxed text-ink-500">
                  Asking prices are what sellers hope to get, not what units
                  actually sell for. Our offer is a cash purchase today, with no
                  listing fees, no meet-ups and no waiting for a buyer.
                </p>
              </section>
            ) : null}

            <OfferExplanation
              breakdown={offer.breakdown as unknown as OfferBreakdown | null}
            />

            {/* A declined offer leaves the customer with the problem that
                brought them here, so this is where the cross-sell earns its
                place. An accepted one gets the quieter treatment. */}
            <div className="mt-10">
              <CrossSell
                placement={offer.status === "DECLINED" ? "declined" : "accepted"}
              />
            </div>

            <section className="mt-10 rounded-2xl bg-ink-900 px-6 py-7 text-white sm:px-8">
              <h2 className="text-lg font-extrabold">If you accept</h2>
              <ol className="mt-4 space-y-3 text-sm text-white/85">
                {[
                  "Bring the unit and your original CR and OR to your chosen M Lhuillier branch.",
                  "We do a short physical inspection — about twenty minutes — to confirm what you told us.",
                  "Papers are signed and you're paid the same day.",
                ].map((step, i) => (
                  <li key={step} className="flex gap-3">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ml-red-400 text-[0.7rem] font-black text-ink-950">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              {submission.preferredBranch ? (
                <p className="mt-5 rounded-xl bg-white/10 px-4 py-3 text-sm">
                  You picked{" "}
                  <strong className="font-semibold">
                    {submission.preferredBranch}
                  </strong>
                  . Any branch works if that changes.
                </p>
              ) : null}
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-ink-200 bg-white py-6">
        <p className="text-center text-xs text-ink-500">
          Reference {submission.refCode} · © {new Date().getFullYear()} M
          Lhuillier
        </p>
      </footer>
    </div>
  );
}

function PendingState({
  vehicle,
  firstName,
  refCode,
  submittedAt,
  status,
}: {
  vehicle: string;
  firstName: string;
  refCode: string;
  submittedAt: Date;
  status: string;
}) {
  const stages = [
    { label: "Submission received", done: true },
    {
      label: "Priced against live listings",
      done: status === "IN_REVIEW" || status === "OFFER_SENT",
    },
    { label: "Appraiser review", done: false, active: status === "IN_REVIEW" },
    { label: "Offer sent to you", done: false },
  ];

  return (
    <div className="animate-rise">
      <div className="rounded-3xl bg-white p-7 text-center ring-1 ring-ink-200/70 sm:p-10">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-ml-red-100">
          <svg
            viewBox="0 0 24 24"
            className="size-7 text-ml-red-700"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="8.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M12 7.5V12l3 1.8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </span>

        <h1 className="mt-5 text-2xl font-extrabold text-ink-950">
          {firstName ? `Thanks, ${firstName}` : "Thanks"} — we&apos;re on it
        </h1>
        <p className="mx-auto mt-2 max-w-md text-[0.9375rem] leading-relaxed text-ink-600">
          Your {vehicle} is with our appraisers. We&apos;ll text you a link to
          this page the moment your offer is ready — usually within 24 hours.
        </p>

        <ol className="mx-auto mt-8 max-w-sm space-y-3 text-left">
          {stages.map((stage) => (
            <li key={stage.label} className="flex items-center gap-3">
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                  stage.done
                    ? "bg-[var(--color-ok)] text-white"
                    : stage.active
                      ? "bg-ml-red-400 text-ink-950"
                      : "bg-ink-200 text-ink-500"
                }`}
              >
                {stage.done ? (
                  <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
                    <path
                      d="m3.5 8.5 3 3 6-7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : stage.active ? (
                  <span className="size-2 animate-pulse rounded-full bg-ink-950" />
                ) : null}
              </span>
              <span
                className={`text-sm font-medium ${
                  stage.done || stage.active ? "text-ink-900" : "text-ink-500"
                }`}
              >
                {stage.label}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-8 border-t border-ink-100 pt-5 text-sm text-ink-500">
          <p>
            Reference{" "}
            <span className="font-mono font-bold text-ink-800">{refCode}</span>
          </p>
          <p className="mt-1 nums">
            Submitted{" "}
            {submittedAt.toLocaleString("en-PH", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-ink-600">
        Bookmark this page — it&apos;s where your offer will appear.
      </p>

      {/* They have a day to wait and may need the money sooner than that. */}
      <div className="mt-8">
        <CrossSell placement="waiting" />
      </div>
    </div>
  );
}

function ResponseState({
  status,
  expired,
}: {
  status: string;
  expired: boolean;
}) {
  if (expired) {
    return (
      <div className="mt-6 rounded-2xl bg-white px-6 py-5 ring-1 ring-ink-200/70">
        <Badge tone="neutral">Expired</Badge>
        <p className="mt-2 text-sm leading-relaxed text-ink-700">
          This offer has lapsed. Market prices move, so we&apos;d rather requote
          than honour a stale number — visit any M Lhuillier branch with your
          reference code and we&apos;ll refresh it.
        </p>
      </div>
    );
  }

  if (status === "ACCEPTED") {
    return (
      <div className="mt-6 rounded-2xl bg-[var(--color-ok-bg)] px-6 py-5 ring-1 ring-green-200">
        <Badge tone="ok">Accepted</Badge>
        <p className="mt-2 text-sm leading-relaxed text-ink-800">
          Thank you. Bring your unit and original papers to your chosen branch —
          no appointment needed. Show this page or quote your reference code.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl bg-white px-6 py-5 ring-1 ring-ink-200/70">
      <Badge tone="neutral">Declined</Badge>
      <p className="mt-2 text-sm leading-relaxed text-ink-700">
        No problem — thanks for giving us the chance. If you change your mind
        within the validity period, visit any branch with your reference code.
      </p>
    </div>
  );
}

function OfferExplanation({
  breakdown,
}: {
  breakdown: OfferBreakdown | null;
}) {
  // Internal risk pricing stays internal; the customer sees the lines that
  // describe their own vehicle.
  const lines = (breakdown?.lines ?? []).filter((l) => !l.internalOnly);
  if (lines.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-lg font-extrabold text-ink-950">
        What moved your number
      </h2>
      <ul className="mt-4 space-y-2">
        {lines.map((line) => (
          <li
            key={`${line.code}-${line.label}`}
            className="flex items-start justify-between gap-4 rounded-xl bg-white px-4 py-3 ring-1 ring-ink-200/70"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-900">{line.label}</p>
              {line.detail ? (
                <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
                  {line.detail}
                </p>
              ) : null}
            </div>
            <span
              className={`shrink-0 text-sm font-bold nums ${
                (line.effectPhp ?? 0) >= 0
                  ? "text-[var(--color-ok)]"
                  : "text-ml-red-700"
              }`}
            >
              {(line.effectPhp ?? 0) >= 0 ? "+" : ""}
              {formatPeso(line.effectPhp ?? 0)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
