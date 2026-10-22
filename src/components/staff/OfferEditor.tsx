"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  OfferBadge,
  PesoInput,
  Select,
  Textarea,
} from "@/components/ui";
import {
  formatCompactPeso,
  formatPeso,
  parsePeso,
  roundToThousand,
} from "@/lib/money";
import { compareAsking } from "@/lib/asking-price";
import type { OfferBreakdown } from "@/lib/valuation";
import {
  OVERRIDE_REASONS,
  MIN_OVERRIDE_NOTE_LENGTH,
  requiresJustification,
} from "@/lib/offer-reasons";
import type { OfferStatus } from "@prisma/client";

type OfferView = {
  id: string;
  version: number;
  status: OfferStatus;
  systemOfferPhp: number;
  appraiserOfferPhp: number | null;
  finalOfferPhp: number | null;
  compLowPhp: number;
  compMidPhp: number;
  compHighPhp: number;
  compCount: number;
  appraiserNotes: string | null;
  overrideReason: string | null;
  customerMessage: string | null;
  sentAt: string | null;
  validUntil: string | null;
  appraiserName: string | null;
};

const QUICK_STEPS = [-20_000, -10_000, -5_000, 5_000, 10_000, 20_000];

/**
 * Where the appraiser makes the call.
 *
 * The system's number is always visible beside whatever the appraiser types,
 * because the point of this screen is the delta — and the breakdown explains
 * every peso of how the system got there.
 */
export function OfferEditor({
  offer,
  breakdown,
  refCode,
  vehicleTitle,
  publicToken,
  delivery,
  liveBand,
  askingPricePhp,
}: {
  offer: OfferView;
  breakdown: OfferBreakdown | null;
  refCode: string;
  vehicleTitle: string;
  publicToken: string;
  /**
   * How a message would reach the customer right now. "none" means every
   * offer email and text is written to the log and delivered nowhere — the
   * one failure in this app with no symptom, since the offer still reads
   * "Sent" afterwards.
   */
  delivery: { email: boolean; sms: boolean };
  /**
   * The band as the comparables table stands right now, recomputed on the
   * server whenever a listing is excluded or added. Null when there is nothing
   * usable to compute from, in which case the offer's own snapshot is shown.
   */
  liveBand: { low: number; mid: number; high: number; count: number } | null;
  /**
   * What the seller said they were hoping for, if they said anything. Shown
   * beside the offer so the appraiser knows before they send whether this is
   * going to be an easy yes or a conversation — not as something to match.
   */
  askingPricePhp: number | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const locked = offer.status === "SENT" || offer.status === "ACCEPTED";

  const [amount, setAmount] = useState<number>(
    offer.finalOfferPhp ?? offer.appraiserOfferPhp ?? offer.systemOfferPhp,
  );
  const [notes, setNotes] = useState(offer.appraiserNotes ?? "");
  const [overrideReason, setOverrideReason] = useState(
    offer.overrideReason ?? "",
  );
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [message, setMessage] = useState(offer.customerMessage ?? "");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<
    null | "save" | "send" | "recalc" | "resend" | "revise"
  >(null);

  // Revising a sent offer is deliberate enough to be its own small form,
  // rather than re-enabling the amount box the customer's number lives in.
  const [revising, setRevising] = useState(false);
  const [reviseAmount, setReviseAmount] = useState(
    offer.finalOfferPhp ?? offer.appraiserOfferPhp ?? offer.systemOfferPhp,
  );
  const [reviseNote, setReviseNote] = useState("");
  const [reviseReason, setReviseReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const history = useRef<number[]>([]);
  const dirty =
    amount !== (offer.appraiserOfferPhp ?? offer.systemOfferPhp) ||
    notes !== (offer.appraiserNotes ?? "") ||
    message !== (offer.customerMessage ?? "") ||
    overrideReason !== (offer.overrideReason ?? "");

  // The history push stays outside the state updater: React invokes updaters
  // more than once (StrictMode, and again when it replays work), so mutating a
  // ref inside one records the same step twice and undo then stalls.
  const changeAmount = useCallback(
    (next: number) => {
      const clamped = Math.max(0, next);
      if (clamped === amount) return;
      history.current.push(amount);
      if (history.current.length > 40) history.current.shift();
      setAmount(clamped);
    },
    [amount],
  );

  const undo = useCallback(() => {
    const previous = history.current.pop();
    if (previous !== undefined) setAmount(previous);
  }, []);

  const offerLink = `${typeof window === "undefined" ? "" : window.location.origin}/track/${publicToken}`;

  const copySummary = useCallback(async () => {
    const lines = [
      `${refCode} — ${vehicleTitle}`,
      `Offer: ${formatPeso(amount)}`,
      `Market band: ${formatPeso(offer.compLowPhp)} / ${formatPeso(offer.compMidPhp)} / ${formatPeso(offer.compHighPhp)} (${offer.compCount} listings)`,
      `System proposed: ${formatPeso(offer.systemOfferPhp)}`,
      `Customer link: ${offerLink}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setToast("Offer summary copied");
    } catch {
      setToast("Couldn't copy — your browser blocked it");
    }
  }, [refCode, vehicleTitle, amount, offer, offerLink]);

  // Ctrl+Z steps the amount back; Ctrl+C copies the summary when nothing is
  // selected, so an appraiser can paste it into chat without reaching for the
  // mouse.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;

      if (e.key.toLowerCase() === "z" && !typing && !locked) {
        e.preventDefault();
        undo();
      }
      if (
        e.key.toLowerCase() === "c" &&
        !typing &&
        !window.getSelection()?.toString()
      ) {
        e.preventDefault();
        void copySummary();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, copySummary, locked]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  async function save(): Promise<boolean> {
    setBusy("save");
    setError(null);
    try {
      const res = await fetch(`/api/staff/offers/${offer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appraiserOfferPhp: amount,
          appraiserNotes: notes || null,
          customerMessage: message || null,
          overrideReason: overrideReason || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Couldn't save.");
        return false;
      }
      setToast("Saved");
      startTransition(() => router.refresh());
      return true;
    } catch {
      setError("Couldn't reach the server.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function recalculate() {
    setBusy("recalc");
    setError(null);
    try {
      const res = await fetch(`/api/staff/offers/${offer.id}/regenerate`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Couldn't recalculate.");
        return;
      }
      setToast("Recalculated from the current comparables");
      startTransition(() => router.refresh());
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    // Persist whatever is on screen first — the number the appraiser sees is
    // the number the customer must get.
    if (dirty && !(await save())) return;

    setBusy("send");
    setError(null);
    try {
      const res = await fetch(`/api/staff/offers/${offer.id}/send`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        field?: string;
      };
      if (!res.ok) {
        setError(body.error ?? "Couldn't send.");
        setFieldError(body.field ?? null);
        setConfirming(false);
        return;
      }
      setFieldError(null);
      setConfirming(false);
      setToast("Offer sent to the customer");
      startTransition(() => router.refresh());
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(null);
    }
  }

  async function resend() {
    setBusy("resend");
    setError(null);
    try {
      const res = await fetch(`/api/staff/offers/${offer.id}/resend`, {
        method: "POST",
      });
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        sentTo?: string[];
      };

      if (!res.ok || !body.ok) {
        setError(body.error ?? "That didn't send.");
        return;
      }

      const where = body.sentTo?.length ? body.sentTo.join(" and ") : "customer";
      setToast(`Offer sent again by ${where}`);
      startTransition(() => router.refresh());
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(null);
    }
  }

  async function revise() {
    setBusy("revise");
    setError(null);
    setFieldError(null);
    try {
      const res = await fetch(`/api/staff/offers/${offer.id}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPhp: reviseAmount,
          overrideReason: reviseReason || null,
          appraiserNotes: reviseNote,
          customerMessage: null,
        }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        field?: string;
        fields?: Record<string, string>;
      };

      if (!res.ok || !body.ok) {
        setError(body.error ?? Object.values(body.fields ?? {})[0] ?? "That didn't save.");
        if (body.field) setFieldError(body.field);
        return;
      }

      setRevising(false);
      setToast("Offer revised and sent to the customer");
      startTransition(() => router.refresh());
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(null);
    }
  }

  const sentAmount =
    offer.finalOfferPhp ?? offer.appraiserOfferPhp ?? offer.systemOfferPhp;

  const delta = amount - offer.systemOfferPhp;

  // The band shown is the live one — recomputed from whatever is included in
  // the comparables table right now — not the snapshot frozen on the offer when
  // it was last calculated. Excluding a listing has to move these numbers
  // immediately, or the appraiser is reading a band that no longer matches the
  // table directly beside it.
  const band = liveBand ?? {
    low: offer.compLowPhp,
    mid: offer.compMidPhp,
    high: offer.compHighPhp,
    count: offer.compCount,
  };

  // The saved offer was priced off the old band, so once they diverge the
  // figure below is stale until it is recalculated.
  const bandMoved = Boolean(liveBand) && liveBand!.mid !== offer.compMidPhp;

  const pctOfMid =
    band.mid > 0 ? Math.round((amount / band.mid) * 100) : null;

  // Above the system's recommendation, a reason and a real note are required.
  // The same rule runs on the server when the offer is sent.
  const needsJustification = requiresJustification(
    amount,
    offer.systemOfferPhp,
  );
  const justificationMissing = needsJustification
    ? !overrideReason
      ? "overrideReason"
      : notes.trim().length < MIN_OVERRIDE_NOTE_LENGTH
        ? "appraiserNotes"
        : null
    : null;

  const selectedReasonHint = OVERRIDE_REASONS.find(
    (r) => r.value === overrideReason,
  )?.hint;

  // Where this offer sits against the middle of the market, spelled out for the
  // confirmation dialog. Paying above the mid is almost always a slip — we have
  // to resell against those same listings — so it is called out in as many
  // words rather than left to be inferred from a percentage.
  // What the seller hoped for, against what the system says the car is
  // worth to us. Fixed to the recommendation so it does not move while the
  // appraiser types.
  const asking = compareAsking(askingPricePhp, offer.systemOfferPhp);

  const midComparison = (() => {
    if (band.mid <= 0) return null;

    const delta = amount - band.mid;
    if (delta === 0) {
      return { text: "exactly the mid market price", className: "text-ink-900" };
    }

    const direction = delta > 0 ? "more" : "less";
    return {
      text: `${formatCompactPeso(Math.abs(delta))} ${direction} than the mid market price`,
      className: delta > 0 ? "text-ml-red-600" : "text-[var(--color-ok)]",
    };
  })();

  return (
    <Card>
      <CardHeader
        title={locked ? "Offer sent" : "Your offer"}
        description={`Version ${offer.version}${offer.appraiserName ? ` · ${offer.appraiserName}` : ""}`}
        action={<OfferBadge status={offer.status} />}
      />

      <CardBody>
        {error ? (
          <div className="mb-4">
            <Alert tone="danger">{error}</Alert>
          </div>
        ) : null}

        <MarketBand
          low={band.low}
          mid={band.mid}
          high={band.high}
          count={band.count}
          offer={amount}
        />

        {bandMoved && !locked ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--color-warn-bg)] px-4 py-3 text-sm ring-1 ring-inset ring-amber-300">
            <span className="text-ink-800">
              The band moved. {formatPeso(offer.systemOfferPhp)} below was
              priced off the previous one.
            </span>
            <button
              type="button"
              onClick={recalculate}
              disabled={busy === "recalc"}
              className="font-semibold text-ml-red-700 hover:underline disabled:opacity-50"
            >
              {busy === "recalc" ? "Recalculating…" : "Recalculate"}
            </button>
          </div>
        ) : null}

        <div className="mt-6">
          <label
            htmlFor="offer-amount"
            className="text-xs font-bold uppercase tracking-wider text-ink-500"
          >
            Offer to the customer
          </label>
          <div className="mt-2">
            <PesoInput
              id="offer-amount"
              disabled={locked}
              value={amount.toLocaleString("en-PH")}
              className="!text-2xl !font-extrabold !py-3"
              onChange={(e) => changeAmount(parsePeso(e.target.value) ?? 0)}
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-ink-600">
              System proposed{" "}
              <span className="font-semibold nums">
                {formatPeso(offer.systemOfferPhp)}
              </span>
              {delta !== 0 ? (
                <span
                  className={`ml-1.5 font-semibold nums ${
                    delta > 0 ? "text-[var(--color-ok)]" : "text-ml-red-700"
                  }`}
                >
                  {delta > 0 ? "+" : ""}
                  {formatPeso(delta)}
                </span>
              ) : null}
            </p>
            {pctOfMid !== null ? (
              <Badge tone={pctOfMid > 95 ? "warn" : "neutral"}>
                {pctOfMid}% of market mid
              </Badge>
            ) : null}
          </div>

          {/* Measured against the system's recommendation, not against
              whatever is currently typed in the box — the appraiser needs to
              know whether this seller is in the right postcode before they
              start moving their own number around. */}
          {askingPricePhp !== null && asking ? (
            <div
              className={`mt-3 rounded-xl px-3.5 py-2.5 ring-1 ring-inset ${
                asking.overAsking
                  ? "bg-ml-red-50 ring-ml-red-200"
                  : "bg-[var(--color-ok-bg)] ring-[var(--color-ok)]/25"
              }`}
            >
              <p className="text-xs text-ink-700">
                Seller asked for{" "}
                <span
                  className={`font-bold nums ${
                    asking.overAsking
                      ? "text-ml-red-700"
                      : "text-[var(--color-ok)]"
                  }`}
                >
                  {formatPeso(askingPricePhp)}
                </span>
              </p>

              <p
                className={`mt-0.5 text-sm font-bold nums ${
                  asking.overAsking
                    ? "text-ml-red-700"
                    : "text-[var(--color-ok)]"
                }`}
              >
                {asking.direction === "equal" ? (
                  "Exactly what we recommend"
                ) : (
                  <>
                    {formatCompactPeso(Math.abs(asking.deltaPhp))} ({asking.pct}
                    %) {asking.direction} our {formatPeso(offer.systemOfferPhp)}{" "}
                    recommendation
                  </>
                )}
              </p>
            </div>
          ) : null}

          {!locked ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {QUICK_STEPS.map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => changeAmount(roundToThousand(amount + step))}
                  className="rounded-lg bg-ink-100 px-2.5 py-1.5 text-xs font-bold text-ink-700 transition-colors hover:bg-ink-200 nums"
                >
                  {step > 0 ? "+" : "−"}
                  {Math.abs(step) / 1000}k
                </button>
              ))}
              <button
                type="button"
                onClick={() => changeAmount(offer.systemOfferPhp)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-ink-500 hover:bg-ink-100"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={undo}
                title="Ctrl+Z"
                className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-ink-500 hover:bg-ink-100"
              >
                Undo
              </button>
            </div>
          ) : null}
        </div>

        {breakdown ? (
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setShowBreakdown((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl bg-ink-50 px-4 py-2.5 text-left transition-colors hover:bg-ink-100"
            >
              <span className="text-sm font-semibold text-ink-800">
                How the system got there
              </span>
              <span
                className={`text-ink-500 transition-transform ${showBreakdown ? "rotate-180" : ""}`}
                aria-hidden="true"
              >
                <svg viewBox="0 0 20 20" className="size-4">
                  <path
                    d="m6 8 4 4 4-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </button>

            {showBreakdown ? (
              <Breakdown breakdown={breakdown} />
            ) : null}
          </div>
        ) : null}

        {!locked ? (
          <>
            <div className="mt-5 space-y-4">
              {needsJustification ? (
                <div className="rounded-xl bg-[var(--color-warn-bg)] p-4 ring-1 ring-inset ring-amber-300">
                  <p className="text-sm font-semibold text-ink-900">
                    You&apos;re offering{" "}
                    {formatCompactPeso(amount - offer.systemOfferPhp)} above the
                    system&apos;s recommendation
                  </p>
                  <p className="mt-1 text-xs text-ink-700">
                    Record why. This is kept with the offer and reviewed with
                    the branch&apos;s other uplifts.
                  </p>

                  <label
                    htmlFor="override-reason"
                    className="mt-3 block text-xs font-bold uppercase tracking-wider text-ink-600"
                  >
                    Reason <span className="text-ml-red-600">*</span>
                  </label>
                  <Select
                    id="override-reason"
                    value={overrideReason}
                    invalid={Boolean(fieldError === "overrideReason")}
                    className="mt-1.5"
                    onChange={(e) => setOverrideReason(e.target.value)}
                  >
                    <option value="">Choose a reason…</option>
                    {OVERRIDE_REASONS.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </Select>
                  {selectedReasonHint ? (
                    <p className="mt-1.5 text-xs text-ink-600">
                      {selectedReasonHint}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="appraiser-notes"
                  className="text-xs font-bold uppercase tracking-wider text-ink-500"
                >
                  Internal notes
                  {needsJustification ? (
                    <span className="ml-1 text-ml-red-600">*</span>
                  ) : null}
                </label>
                <Textarea
                  id="appraiser-notes"
                  rows={3}
                  value={notes}
                  invalid={Boolean(fieldError === "appraiserNotes")}
                  placeholder={
                    needsJustification
                      ? "Required: what you saw that the system couldn't."
                      : "Why you moved the number. Only staff see this."
                  }
                  className="mt-2"
                  onChange={(e) => setNotes(e.target.value)}
                />
                {needsJustification ? (
                  <p className="mt-1 text-xs text-ink-500">
                    At least a sentence — someone reviewing this in three
                    months needs to understand the call.
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="customer-message"
                  className="text-xs font-bold uppercase tracking-wider text-ink-500"
                >
                  Message to the customer
                </label>
                <Textarea
                  id="customer-message"
                  rows={3}
                  value={message}
                  placeholder="Shown with the offer. e.g. Offer assumes the CR is in your name and the unit passes inspection at the branch."
                  className="mt-2"
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                loading={busy === "save"}
                onClick={save}
              >
                Save draft
              </Button>
              <Button
                variant="secondary"
                size="sm"
                loading={busy === "recalc"}
                onClick={recalculate}
              >
                Recalculate
              </Button>
              <Button variant="ghost" size="sm" onClick={copySummary}>
                Copy summary
              </Button>
            </div>

            <div className="mt-5 border-t border-ink-100 pt-5">
              {confirming ? (
                <div className="rounded-xl bg-[var(--color-warn-bg)] p-4 ring-1 ring-amber-300">
                  <p className="text-sm font-semibold text-ink-900">
                    Send {formatPeso(amount)} to{" "}
                    {vehicleTitle.toLowerCase().startsWith("incomplete")
                      ? "this customer"
                      : "the customer"}
                    ?
                  </p>
                  {midComparison ? (
                    <p className="mt-2 text-sm text-ink-900">
                      You are offering the customer{" "}
                      <strong className={`font-bold ${midComparison.className}`}>
                        {midComparison.text}
                      </strong>
                      . Are you sure you want to send it?
                    </p>
                  ) : null}

                  {delivery.email || delivery.sms ? (
                    <p className="mt-1 text-xs text-ink-700">
                      They get a{delivery.sms ? " text" : "n email"} with a link
                      straight away. You can&apos;t edit this version
                      afterwards.
                    </p>
                  ) : (
                    <p className="mt-2 rounded-lg bg-ml-red-50 px-3 py-2 text-xs font-semibold leading-relaxed text-ml-red-700 ring-1 ring-inset ring-ml-red-200">
                      No email or SMS gateway is connected, so nothing will
                      actually be delivered. The offer will read &ldquo;Sent&rdquo;
                      and the customer will hear nothing — send them the link
                      yourself, or ask an administrator to finish Settings
                      first.
                    </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" loading={busy === "send"} onClick={send}>
                      Yes, send it
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirming(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="lg"
                  className="w-full"
                  disabled={amount <= 0 || Boolean(justificationMissing)}
                  onClick={() => setConfirming(true)}
                >
                  Send offer to customer
                </Button>
              )}

              {!confirming && justificationMissing ? (
                <p className="mt-2 text-center text-xs text-ink-600">
                  {justificationMissing === "overrideReason"
                    ? "Choose a reason above before sending."
                    : "Add an internal note above before sending."}
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <div className="mt-5 space-y-4 border-t border-ink-100 pt-5">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-600">Sent</dt>
                <dd className="font-medium text-ink-900">
                  {offer.sentAt
                    ? new Date(offer.sentAt).toLocaleString("en-PH", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-600">Valid until</dt>
                <dd className="font-medium text-ink-900">
                  {offer.validUntil
                    ? new Date(offer.validUntil).toLocaleDateString("en-PH", {
                        dateStyle: "medium",
                      })
                    : "—"}
                </dd>
              </div>
            </dl>

            {offer.customerMessage ? (
              <div className="rounded-xl bg-ink-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-500">
                  Message sent
                </p>
                <p className="mt-1.5 whitespace-pre-line text-sm text-ink-800">
                  {offer.customerMessage}
                </p>
              </div>
            ) : null}

            {revising ? (
              <div className="rounded-xl bg-ink-50 p-4 ring-1 ring-inset ring-ink-200">
                <p className="text-sm font-semibold text-ink-900">
                  Revise this offer
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-600">
                  The customer has {formatPeso(sentAmount)}. Saving sends them
                  the new figure and restarts their response window; the
                  version they hold now is kept on record.
                </p>

                <label
                  htmlFor="revise-amount"
                  className="mt-3 block text-xs font-bold uppercase tracking-wider text-ink-600"
                >
                  New offer
                </label>
                <PesoInput
                  id="revise-amount"
                  className="mt-1.5 !text-xl !font-bold"
                  value={reviseAmount.toLocaleString("en-PH")}
                  onChange={(e) =>
                    setReviseAmount(Math.max(0, parsePeso(e.target.value) ?? 0))
                  }
                />
                {reviseAmount !== sentAmount ? (
                  <p
                    className={`mt-1.5 text-xs font-bold nums ${
                      reviseAmount > sentAmount
                        ? "text-[var(--color-ok)]"
                        : "text-ml-red-700"
                    }`}
                  >
                    {reviseAmount > sentAmount ? "+" : "−"}
                    {formatPeso(Math.abs(reviseAmount - sentAmount))}{" "}
                    {reviseAmount > sentAmount ? "more" : "less"} than they were
                    told
                  </p>
                ) : null}

                {requiresJustification(reviseAmount, offer.systemOfferPhp) ? (
                  <>
                    <label
                      htmlFor="revise-reason"
                      className="mt-3 block text-xs font-bold uppercase tracking-wider text-ink-600"
                    >
                      Reason <span className="text-ml-red-600">*</span>
                    </label>
                    <Select
                      id="revise-reason"
                      className="mt-1.5"
                      value={reviseReason}
                      invalid={fieldError === "overrideReason"}
                      onChange={(e) => setReviseReason(e.target.value)}
                    >
                      <option value="">Choose a reason…</option>
                      {OVERRIDE_REASONS.map((reason) => (
                        <option key={reason.value} value={reason.value}>
                          {reason.label}
                        </option>
                      ))}
                    </Select>
                  </>
                ) : null}

                <label
                  htmlFor="revise-note"
                  className="mt-3 block text-xs font-bold uppercase tracking-wider text-ink-600"
                >
                  Why it changed <span className="text-ml-red-600">*</span>
                </label>
                <Textarea
                  id="revise-note"
                  rows={3}
                  className="mt-1.5"
                  value={reviseNote}
                  invalid={fieldError === "appraiserNotes"}
                  placeholder="Internal. Kept with both versions."
                  onChange={(e) => setReviseNote(e.target.value)}
                />

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    loading={busy === "revise"}
                    disabled={
                      reviseAmount === sentAmount ||
                      reviseNote.trim().length < MIN_OVERRIDE_NOTE_LENGTH
                    }
                    onClick={revise}
                  >
                    Send the revised offer
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setRevising(false);
                      setError(null);
                    }}
                    className="text-sm font-semibold text-ink-600 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={copySummary}>
                Copy customer link
              </Button>
              {offer.status === "SENT" && !revising ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setReviseAmount(sentAmount);
                    setReviseNote("");
                    setReviseReason("");
                    setRevising(true);
                  }}
                >
                  Revise offer
                </Button>
              ) : null}
              {/* The same offer again, not a new one. A text that never
                  arrived shouldn't cost the customer a re-valuation — the
                  market moves, and a fresh quote could come back lower for
                  no reason they could understand. */}
              <Button
                variant="secondary"
                size="sm"
                loading={busy === "resend"}
                onClick={resend}
              >
                Resend to customer
              </Button>
            </div>
          </div>
        )}

        {toast ? (
          <p
            role="status"
            className="mt-4 rounded-lg bg-ink-900 px-3 py-2 text-center text-xs font-semibold text-white"
          >
            {toast}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}

function MarketBand({
  low,
  mid,
  high,
  count,
  offer,
}: {
  low: number;
  mid: number;
  high: number;
  count: number;
  offer: number;
}) {
  if (count === 0 || high <= low) {
    return (
      <Alert tone="warn" title="No market band">
        Add comparable listings and recalculate before releasing an offer.
      </Alert>
    );
  }

  const span = high - low;
  const pos = (v: number) => Math.min(100, Math.max(0, ((v - low) / span) * 100));

  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <Column label="Lowest" value={low} />
        <Column label="Middle" value={mid} highlight />
        <Column label="Highest" value={high} align="right" />
      </div>

      <div className="relative mt-3 h-2 rounded-full bg-gradient-to-r from-ink-200 via-ml-red-300 to-ink-200">
        <span
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-900 ring-2 ring-white"
          style={{ left: `${pos(mid)}%` }}
          aria-hidden="true"
        />
        <span
          className="absolute -top-1 size-4 -translate-x-1/2 rounded-full bg-ml-red-600 ring-2 ring-white transition-[left] duration-300"
          style={{ left: `${pos(offer)}%` }}
          aria-hidden="true"
        />
      </div>

      <p className="mt-2.5 text-xs text-ink-500">
        From {count} listing{count === 1 ? "" : "s"}, outliers removed. The red
        marker is your offer.
      </p>
    </div>
  );
}

function Column({
  label,
  value,
  highlight,
  align = "left",
}: {
  label: string;
  value: number;
  highlight?: boolean;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <p className="text-[0.65rem] font-bold uppercase tracking-wider text-ink-500">
        {label}
      </p>
      <p
        className={`mt-0.5 font-bold nums ${
          highlight ? "text-base text-ink-950" : "text-sm text-ink-700"
        }`}
      >
        {formatPeso(value)}
      </p>
    </div>
  );
}

function Breakdown({ breakdown }: { breakdown: OfferBreakdown }) {
  return (
    <div className="mt-2 rounded-xl bg-white p-4 ring-1 ring-ink-200">
      <dl className="space-y-2 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-600">
            Market mid × {Math.round(breakdown.buyMargin * 100)}% buy margin
          </dt>
          <dd className="font-semibold text-ink-900 nums">
            {formatPeso(breakdown.basePhp)}
          </dd>
        </div>

        {breakdown.lines.map((line) => (
          <div
            key={`${line.code}-${line.label}`}
            className="flex items-baseline justify-between gap-4 border-t border-ink-100 pt-2"
          >
            <dt className="min-w-0">
              <span className="text-ink-700">{line.label}</span>
              {line.internalOnly ? (
                <span className="ml-1.5 text-[0.65rem] font-bold uppercase text-ink-400">
                  internal
                </span>
              ) : null}
              {line.detail ? (
                <span className="mt-0.5 block text-xs text-ink-500">
                  {line.detail}
                </span>
              ) : null}
            </dt>
            <dd
              className={`shrink-0 font-semibold nums ${
                (line.effectPhp ?? 0) < 0
                  ? "text-ml-red-700"
                  : "text-[var(--color-ok)]"
              }`}
            >
              {line.kind === "factor"
                ? `×${line.value.toFixed(2)}`
                : `−${formatPeso(line.value)}`}
            </dd>
          </div>
        ))}

        <div className="flex items-baseline justify-between gap-4 border-t-2 border-ink-200 pt-2">
          <dt className="font-bold text-ink-900">System offer</dt>
          <dd className="font-extrabold text-ink-950 nums">
            {formatPeso(breakdown.offerPhp)}
          </dd>
        </div>

        {breakdown.clampedBy ? (
          <p className="rounded-lg bg-[var(--color-warn-bg)] px-3 py-2 text-xs text-[var(--color-warn)]">
            {breakdown.clampedBy === "ceiling"
              ? "Capped at 95% of the lowest live asking price — we have to resell against it."
              : "Raised to the floor: the adjustments would otherwise have taken it below 40% of market mid."}
          </p>
        ) : null}
      </dl>
    </div>
  );
}
