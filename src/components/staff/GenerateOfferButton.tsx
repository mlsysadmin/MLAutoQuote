"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button } from "@/components/ui";

/** Attaches a valuation to a submission that arrived without one. */
export function GenerateOfferButton({
  submissionId,
  hasComparables,
}: {
  submissionId: string;
  hasComparables: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/staff/submissions/${submissionId}/generate-offer`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Couldn't build an offer.");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <p className="text-sm leading-relaxed text-ink-600">
        {hasComparables
          ? "Build a valuation from the comparables below. Nothing reaches the customer until you release it."
          : "Add comparable listings below first — then build the valuation. Nothing reaches the customer until you release it."}
      </p>
      <Button onClick={generate} loading={busy} className="w-full">
        Build the offer
      </Button>
    </div>
  );
}
