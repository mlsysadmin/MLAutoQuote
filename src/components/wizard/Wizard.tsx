"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Logo, Stepper, Alert } from "@/components/ui";
import {
  EMPTY_DRAFT,
  STEP_LABELS,
  validateStep,
  TOTAL_STEPS,
  stepCompletion,
  type Draft,
} from "@/lib/wizard";
import { StepCar } from "./StepCar";
import { StepCheck } from "./StepCheck";
import { StepPhotos, type UploadedPhoto } from "./StepPhotos";
import { StepYou } from "./StepYou";

const LOCAL_KEY = "mlaq.draft.v1";
const AUTOSAVE_MS = 900;

type Persisted = {
  submissionId: string | null;
  publicToken: string | null;
  refCode: string | null;
  step: number;
  draft: Draft;
};

export type SaveState = "idle" | "saving" | "saved" | "error";

export function Wizard({
  prefill,
}: {
  /** Set when the customer arrived from a value guide for a specific model. */
  prefill?: Partial<Draft>;
} = {}) {
  const router = useRouter();
  const [resumed, setResumed] = useState(false);

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [step, setStep] = useState(1);
  const [furthest, setFurthest] = useState(1);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // The wizard owns the photo thumbnails, so it is the one that releases them.
  // Read through a ref at unmount time: the cleanup must see the final list,
  // not the empty one this effect closed over on mount.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      for (const photo of photosRef.current) {
        if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl);
      }
    };
  }, []);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  // Undo stack for field edits. Customers correct themselves constantly on a
  // form this long, and Ctrl+Z is what everyone reaches for first.
  const history = useRef<Draft[]>([]);
  const future = useRef<Draft[]>([]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<Partial<Draft> & { lastStep?: number }>({});

  // ── Restore a previous session ─────────────────────────────────────────────
  // localStorage can't be read during SSR, and reading it in a lazy initialiser
  // would make the server and client render different trees. Restoring in an
  // effect — behind the skeleton below, so nothing visible flashes — is the
  // hydration-safe way to do it, and it runs exactly once.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Persisted;
        if (saved?.draft) {
          const step = Math.min(saved.step || 1, TOTAL_STEPS);
          setDraft({ ...EMPTY_DRAFT, ...saved.draft });
          setSubmissionId(saved.submissionId ?? null);
          setRefCode(saved.refCode ?? null);
          setStep(step);
          setFurthest(step);
          // Say so rather than silently dropping them mid-form.
          if (step > 1) setResumed(true);
        }
      } else if (prefill) {
        setDraft({ ...EMPTY_DRAFT, ...prefill });
      }
    } catch {
      // A corrupt draft shouldn't block someone from starting over.
    }
    setRestored(true);
    // Runs once on mount; `prefill` comes from the URL and can't change after.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Photos already on the server ───────────────────────────────────────────
  // The thumbnail grid lives in this component's state, so a reload leaves it
  // empty even though the photos are safely stored. A customer who comes back
  // then photographs the same wing again, which is how submissions arrived
  // carrying three fronts and four IDs. Asking the server what it already has
  // is the fix; the server also refuses to keep two photos in one slot.
  useEffect(() => {
    if (!restored || !submissionId || photos.length > 0) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/submissions/${submissionId}/photos`);
        if (!res.ok) return;
        const body = (await res.json()) as {
          photos: Array<{ id: string; slot: string; bytes: number; url: string | null }>;
        };
        if (cancelled || body.photos.length === 0) return;

        setPhotos(
          body.photos
            .filter((p) => p.url)
            .map((p) => ({
              key: `saved-${p.id}`,
              id: p.id,
              slot: p.slot,
              // A stored URL, not an object URL — nothing here to revoke.
              previewUrl: p.url as string,
              status: "done" as const,
              progress: 100,
              rotation: 0,
            })),
        );
      } catch {
        // Offline: the form still works, they just re-take anything missing.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [restored, submissionId, photos.length]);

  // ── Mirror to localStorage so a dropped connection costs nothing ───────────
  useEffect(() => {
    if (!restored) return;
    try {
      const payload: Persisted = {
        submissionId,
        publicToken: null,
        refCode,
        step,
        draft,
      };
      localStorage.setItem(LOCAL_KEY, JSON.stringify(payload));
    } catch {
      // Private browsing, quota — not worth interrupting the customer.
    }
  }, [draft, step, submissionId, refCode, restored]);

  // ── Autosave to the server ─────────────────────────────────────────────────
  const flushSave = useCallback(async () => {
    const id = submissionId;
    const patch = pendingSave.current;
    if (!id || Object.keys(patch).length === 0) return;

    pendingSave.current = {};
    setSaveState("saving");
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
        keepalive: true,
      });
      setSaveState(res.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  }, [submissionId]);

  const queueSave = useCallback(
    (patch: Partial<Draft> & { lastStep?: number }) => {
      Object.assign(pendingSave.current, patch);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flushSave, AUTOSAVE_MS);
    },
    [flushSave],
  );

  // Don't lose the last few keystrokes when the tab goes away.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flushSave();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [flushSave]);

  // ── Field updates ──────────────────────────────────────────────────────────
  // Undo bookkeeping happens outside the state updaters. React invokes an
  // updater more than once (StrictMode, and again when it replays work), so a
  // ref mutated inside one records the same step twice and undo then stalls.
  const set = useCallback(
    <K extends keyof Draft>(key: K, value: Draft[K]) => {
      if (draft[key] === value) return;

      history.current.push(draft);
      if (history.current.length > 50) history.current.shift();
      future.current = [];
      // Functional, not `{ ...draft, [key]: value }`: two calls in the same
      // tick both build from the render's draft, and the second silently
      // discards the first. Typing never does that; filling four fields from
      // a scanned ID does.
      setDraft((prev) => ({ ...prev, [key]: value }));

      setErrors((prev) => {
        if (!prev[key as string]) return prev;
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
      queueSave({ [key]: value } as Partial<Draft>);
    },
    [draft, queueSave],
  );

  /**
   * Fills several fields as one change — one undo step, one save, one render.
   *
   * Used where a batch is genuinely one action from the customer's point of
   * view, such as reading four fields off their ID: undoing that should put
   * the form back as it was, not step backwards through it field by field.
   */
  const setMany = useCallback(
    (values: Partial<Draft>) => {
      const keys = Object.keys(values) as Array<keyof Draft>;
      if (keys.length === 0) return;

      history.current.push(draft);
      if (history.current.length > 50) history.current.shift();
      future.current = [];
      setDraft((prev) => ({ ...prev, ...values }));

      setErrors((prev) => {
        if (!keys.some((k) => prev[k as string])) return prev;
        const next = { ...prev };
        for (const key of keys) delete next[key as string];
        return next;
      });
      queueSave(values);
    },
    [draft, queueSave],
  );

  const undo = useCallback(() => {
    const previous = history.current.pop();
    if (!previous) return;
    future.current.push(draft);
    setDraft(previous);
    queueSave(previous);
  }, [draft, queueSave]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    history.current.push(draft);
    setDraft(next);
    queueSave(next);
  }, [draft, queueSave]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || e.key.toLowerCase() !== "z") return;
      // Let the browser handle undo inside a text field the customer is typing in.
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
      if (typing && !e.shiftKey) return;

      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // ── Creating the server-side draft ─────────────────────────────────────────
  const ensureSubmission = useCallback(async (): Promise<string | null> => {
    if (submissionId) return submissionId;
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { id: string; refCode: string };
      setSubmissionId(body.id);
      setRefCode(body.refCode);
      return body.id;
    } catch {
      return null;
    }
  }, [submissionId, draft]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  // Steps the customer has actually finished, so the stepper can tick them off
  // rather than just colouring in whatever is behind the cursor.
  const completion = useMemo(
    () => stepCompletion(draft, new Set(photos.map((p) => p.slot))),
    [draft, photos],
  );

  const goTo = useCallback(
    (n: number) => {
      setStep(n);
      setFurthest((f) => Math.max(f, n));
      queueSave({ lastStep: n });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [queueSave],
  );

  const next = useCallback(async () => {
    const e = validateStep(step, draft);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      const first = document.querySelector('[aria-invalid="true"]');
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});

    // The draft row is created the moment we have something worth keeping,
    // not on page load — no empty rows from people who bounce.
    if (step === 1 && !submissionId) {
      await ensureSubmission();
    }
    goTo(Math.min(step + 1, TOTAL_STEPS));
  }, [step, draft, submissionId, ensureSubmission, goTo]);

  const back = useCallback(() => goTo(Math.max(step - 1, 1)), [step, goTo]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const submit = useCallback(async () => {
    const id = submissionId ?? (await ensureSubmission());
    if (!id) {
      setSubmitError("We couldn't reach our servers. Check your connection and try again.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await flushSave();

    try {
      const res = await fetch(`/api/submissions/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const body = (await res.json()) as {
        publicToken?: string;
        error?: string;
        fields?: Record<string, string>;
      };

      if (!res.ok || !body.publicToken) {
        setSubmitError(body.error ?? "Something went wrong. Please try again.");
        if (body.fields) setErrors(body.fields);
        setSubmitting(false);
        return;
      }

      try {
        localStorage.removeItem(LOCAL_KEY);
      } catch {
        /* ignore */
      }
      router.push(`/track/${body.publicToken}?new=1`);
    } catch {
      setSubmitError("We couldn't submit right now. Your answers are saved — please try again.");
      setSubmitting(false);
    }
  }, [submissionId, ensureSubmission, flushSave, router]);

  if (!restored) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="shimmer h-8 w-48 rounded-lg" />
        <div className="shimmer mt-6 h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-ink-50">
      <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-white/90 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <a
            href="https://www.mlhuillier.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="M Lhuillier home (opens in a new tab)"
          >
              <Logo />
            </a>
            <SaveIndicator state={saveState} refCode={refCode} />
          </div>
          <div className="mt-3">
            <Stepper
              steps={STEP_LABELS}
              current={step}
              furthest={furthest}
              completion={completion}
              onJump={goTo}
            />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-3xl px-4 pb-32 pt-5 sm:px-6 sm:pt-8">
        {resumed ? (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-[var(--color-ok-bg)] px-5 py-3.5">
            <p className="text-sm font-medium text-[var(--color-ok)]">
              Picked up where you left off.
            </p>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem(LOCAL_KEY);
                } catch {
                  /* ignore */
                }
                setDraft(EMPTY_DRAFT);
                setSubmissionId(null);
                setRefCode(null);
                setPhotos([]);
                setStep(1);
                setFurthest(1);
                setResumed(false);
              }}
              className="text-sm font-semibold text-[var(--color-ok)] underline underline-offset-2 hover:no-underline"
            >
              Start over
            </button>
          </div>
        ) : null}

        <div key={step} className="animate-rise">
          {/* One step, two sections: what the car is, then what state it is
              in. They are the same mental mode — facts about the unit in front
              of you — and a page break between them bought nothing. */}
          {step === 1 && (
            <>
              <StepCar draft={draft} set={set} setMany={setMany} errors={errors} />
              <StepCheck draft={draft} set={set} setMany={setMany} errors={errors} />
            </>
          )}
          {step === 2 && (
            <StepPhotos
              submissionId={submissionId}
              ensureSubmission={ensureSubmission}
              photos={photos}
              setPhotos={setPhotos}
              draft={draft}
              set={set}
            />
          )}
          {step === 3 && (
            <StepYou
              draft={draft}
              set={set}
              setMany={setMany}
              errors={errors}
              photos={photos}
              onEdit={goTo}
              submissionId={submissionId}
            />
          )}
        </div>

        {submitError ? (
          <div className="mt-6">
            <Alert tone="danger" title="We couldn't submit that">
              {submitError}
            </Alert>
          </div>
        ) : null}
      </main>

      {/* Sticky action bar — the customer never has to hunt for "next". */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <Button
            variant="ghost"
            onClick={back}
            disabled={step === 1 || submitting}
            className={step === 1 ? "invisible" : ""}
          >
            Back
          </Button>

          {step < TOTAL_STEPS ? (
            <Button onClick={next} size="lg" className="min-w-36">
              Continue
            </Button>
          ) : (
            <Button
              onClick={submit}
              size="lg"
              loading={submitting}
              className="min-w-44"
            >
              {submitting ? "Submitting…" : "Submit for appraisal"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({
  state,
  refCode,
}: {
  state: SaveState;
  refCode: string | null;
}) {
  const label =
    state === "saving"
      ? "Saving…"
      : state === "error"
        ? "Saved on this device"
        : state === "saved"
          ? "Saved"
          : refCode
            ? "Saved"
            : "";

  return (
    <div className="text-right">
      {refCode ? (
        <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-ink-400 nums">
          {refCode}
        </p>
      ) : null}
      {label ? (
        <p
          className={`text-xs font-medium ${
            state === "error" ? "text-[var(--color-danger)]" : "text-ink-500"
          }`}
          aria-live="polite"
        >
          {label}
        </p>
      ) : null}
    </div>
  );
}
