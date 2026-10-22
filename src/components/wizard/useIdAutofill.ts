"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Draft } from "@/lib/wizard";

export type AutofillState =
  | { status: "idle" }
  | { status: "reading" }
  | { status: "filled"; fields: string[] }
  | { status: "nothing" }
  | { status: "unavailable" };

type ExtractedIdentity = {
  fullName?: string | null;
  birthDate?: string | null;
  idType?: string | null;
  idNumber?: string | null;
  confidence: number;
  filled: string[];
};

/** Draft keys the reader may fill, paired with the extracted field they come from. */
const MAPPING = [
  ["customerName", "fullName"],
  ["birthDate", "birthDate"],
  ["idType", "idType"],
  ["idNumber", "idNumber"],
] as const;

/**
 * Reads the government ID the customer uploaded two steps ago and offers its
 * contents as a starting point for this step.
 *
 * Two rules it never breaks: it only ever fills a field the customer has left
 * empty, and everything it writes stays editable. OCR of a laminated card is a
 * decent first guess, not a source of truth — the customer is still the one
 * who confirms their own name.
 */
export function useIdAutofill({
  submissionId,
  draft,
  setMany,
  hasIdPhoto,
}: {
  submissionId: string | null;
  draft: Draft;
  /**
   * Fills every field in one change. Four separate `set` calls in the same
   * tick would each overwrite the last, so only the ID number would survive.
   */
  setMany: (values: Partial<Draft>) => void;
  hasIdPhoto: boolean;
}) {
  const [state, setState] = useState<AutofillState>({ status: "idle" });

  // One attempt per visit. Without this the effect re-runs on every keystroke,
  // and each run is a paid call.
  const attempted = useRef(false);

  // Read the draft through a ref so filling a field doesn't retrigger the
  // effect that filled it.
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const run = useCallback(async () => {
    if (!submissionId) return;

    setState({ status: "reading" });
    try {
      const res = await fetch(`/api/submissions/${submissionId}/read-id`, {
        method: "POST",
      });
      if (!res.ok) {
        setState({ status: "nothing" });
        return;
      }

      const body = (await res.json()) as {
        available: boolean;
        identity: ExtractedIdentity | null;
        reason?: string;
      };

      if (!body.available) {
        setState({ status: "unavailable" });
        return;
      }
      if (body.reason === "no-photo") {
        // Nothing to read yet. Let a later upload try again, and say nothing
        // in the meantime — there is no news here for the customer.
        attempted.current = false;
        setState({ status: "idle" });
        return;
      }
      if (!body.identity) {
        setState({ status: "nothing" });
        return;
      }

      const current = draftRef.current;
      const filled: string[] = [];
      const values: Partial<Draft> = {};

      for (const [draftKey, extractedKey] of MAPPING) {
        const value = body.identity[extractedKey];
        // Never overwrite something the customer has already typed.
        if (!value || String(current[draftKey] ?? "").trim()) continue;
        values[draftKey] = value as Draft[typeof draftKey];
        filled.push(draftKey);
      }

      if (filled.length > 0) setMany(values);

      setState(
        filled.length > 0
          ? { status: "filled", fields: filled }
          : { status: "nothing" },
      );
    } catch {
      setState({ status: "nothing" });
    }
  }, [submissionId, setMany]);

  useEffect(() => {
    if (attempted.current || !submissionId) return;

    // Note there is no `hasIdPhoto` guard here. It only knows about uploads
    // made in this browser session, so a customer who reloads — or comes back
    // tomorrow from their saved link — would otherwise be asked to type
    // details off a card we are already holding. The server knows better, and
    // answers from a single query when there is no ID photo, so asking is
    // cheap. `hasIdPhoto` stays in the dependencies so that uploading one
    // during this visit starts a fresh attempt.

    // Nothing to do if they have already filled this in themselves.
    const current = draftRef.current;
    const allPresent = MAPPING.every(([key]) =>
      String(current[key] ?? "").trim(),
    );
    if (allPresent) return;

    attempted.current = true;
    void run();
  }, [submissionId, hasIdPhoto, run]);

  return { state, retry: run };
}

export const AUTOFILL_FIELD_LABELS: Record<string, string> = {
  customerName: "name",
  birthDate: "date of birth",
  idType: "ID type",
  idNumber: "ID number",
};
