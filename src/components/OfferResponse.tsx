"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Textarea } from "@/components/ui";

const DECLINE_REASONS = [
  "The amount is lower than I expected",
  "I found a better offer elsewhere",
  "I've decided not to sell for now",
  "Something else",
];

/** Accept or decline. Declining asks why — politely, and optionally. */
export function OfferResponse({ token }: { token: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "confirm-accept" | "decline">("idle");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respond(action: "ACCEPT" | "DECLINE") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/track/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason:
            action === "DECLINE"
              ? [reason, note].filter(Boolean).join(" — ") || null
              : null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "That didn't go through. Please try again.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Check your connection.");
      setBusy(false);
    }
  }

  if (mode === "confirm-accept") {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-ink-200/70">
        {error ? (
          <div className="mb-4">
            <Alert tone="danger">{error}</Alert>
          </div>
        ) : null}
        <h2 className="text-base font-bold text-ink-950">
          Accept this offer?
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
          We&apos;ll hold the amount for you. The final payout is confirmed after
          a short inspection at the branch — if the unit matches what you told
          us, nothing changes.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            size="lg"
            loading={busy}
            onClick={() => respond("ACCEPT")}
          >
            Yes, accept
          </Button>
          <Button size="lg" variant="ghost" onClick={() => setMode("idle")}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "decline") {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-ink-200/70">
        {error ? (
          <div className="mb-4">
            <Alert tone="danger">{error}</Alert>
          </div>
        ) : null}
        <h2 className="text-base font-bold text-ink-950">
          Mind telling us why?
        </h2>
        <p className="mt-1.5 text-sm text-ink-600">
          Optional — but it helps us price better next time.
        </p>

        <div className="mt-4 space-y-2">
          {DECLINE_REASONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setReason(option)}
              className={`block w-full rounded-xl px-4 py-3 text-left text-sm font-medium ring-1 ring-inset transition-colors ${
                reason === option
                  ? "bg-ml-red-50 text-ml-red-800 ring-2 ring-ml-red-500"
                  : "bg-white text-ink-700 ring-ink-200 hover:bg-ink-50"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <Textarea
          rows={3}
          value={note}
          maxLength={400}
          placeholder="Anything else you'd like us to know (optional)"
          className="mt-3"
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            size="lg"
            variant="danger"
            loading={busy}
            onClick={() => respond("DECLINE")}
          >
            Decline the offer
          </Button>
          <Button size="lg" variant="ghost" onClick={() => setMode("idle")}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-ink-200/70 sm:p-6">
      {error ? (
        <div className="mb-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size="lg"
          className="flex-1"
          onClick={() => setMode("confirm-accept")}
        >
          Accept this offer
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="flex-1"
          onClick={() => setMode("decline")}
        >
          Not for me
        </Button>
      </div>
      <p className="mt-3 text-center text-xs text-ink-500">
        No obligation either way. Accepting doesn&apos;t commit you until the
        papers are signed at the branch.
      </p>
    </div>
  );
}
