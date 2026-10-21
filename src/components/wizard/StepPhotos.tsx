"use client";

import { useCallback, useRef, useState } from "react";
import { Alert } from "@/components/ui";
import { PHOTO_SLOTS, REQUIRED_SLOTS, type PhotoSlotSpec } from "@/lib/wizard";
import { prepareImage, formatBytes, withConcurrency } from "@/lib/image-client";
import { StepHeading, Panel } from "./StepShell";
import { SlotGuide } from "./SlotGuides";

export type UploadedPhoto = {
  /** Local id until the server confirms, then the Photo row id. */
  key: string;
  id: string | null;
  slot: string;
  previewUrl: string;
  status: "preparing" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
  savedBytes?: number;
};

export function StepPhotos({
  submissionId,
  ensureSubmission,
  photos,
  setPhotos,
}: {
  submissionId: string | null;
  ensureSubmission: () => Promise<string | null>;
  photos: UploadedPhoto[];
  setPhotos: React.Dispatch<React.SetStateAction<UploadedPhoto[]>>;
}) {
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Thumbnails are object URLs, and their lifetime belongs to the `photos`
  // array — which lives in the wizard and outlives this component. This step
  // unmounts every time the customer moves to another step, so revoking here
  // would leave every thumbnail a broken image the moment they came back.
  // Revoking happens where a photo is actually dropped: in `remove` below, and
  // in the wizard when the whole form goes away.

  const upload = useCallback(
    async (slot: string, file: File) => {
      const key = `${slot}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      setPhotos((prev) => [
        ...prev,
        {
          key,
          id: null,
          slot,
          previewUrl: "",
          status: "preparing",
          progress: 0,
        },
      ]);

      const patch = (next: Partial<UploadedPhoto>) =>
        setPhotos((prev) =>
          prev.map((p) => (p.key === key ? { ...p, ...next } : p)),
        );

      try {
        // A government ID is a landscape card. Someone holding their phone
        // upright produces a sideways photo that nobody can read, so that one
        // slot is turned to landscape automatically.
        const prepared = await prepareImage(file, {
          preferLandscape: slot === "DOC_ID",
        });
        patch({
          previewUrl: prepared.previewUrl,
          status: "uploading",
          savedBytes: prepared.originalBytes - prepared.blob.size,
        });

        const id = submissionId ?? (await ensureSubmission());
        if (!id) throw new Error("offline");

        const signRes = await fetch(`/api/submissions/${id}/photos/sign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slot, contentType: prepared.contentType }),
        });
        if (!signRes.ok) throw new Error("sign failed");
        const target = (await signRes.json()) as {
          url: string;
          method: string;
          headers: Record<string, string>;
          storageKey: string;
        };

        await putWithProgress(target, prepared.blob, (pct) =>
          patch({ progress: pct }),
        );

        const confirmRes = await fetch(`/api/submissions/${id}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slot,
            storageKey: target.storageKey,
            contentType: prepared.contentType,
            bytes: prepared.blob.size,
            width: prepared.width || null,
            height: prepared.height || null,
          }),
        });
        if (!confirmRes.ok) throw new Error("confirm failed");
        const saved = (await confirmRes.json()) as { id: string };

        patch({ id: saved.id, status: "done", progress: 100 });
      } catch {
        patch({
          status: "error",
          error: "Upload didn't finish. Tap to try again.",
        });
        setGlobalError(
          "One or more photos didn't upload. Check your connection and retry the ones marked in red.",
        );
      }
    },
    [submissionId, ensureSubmission, setPhotos],
  );

  const remove = useCallback(
    async (photo: UploadedPhoto) => {
      setPhotos((prev) => prev.filter((p) => p.key !== photo.key));
      // This photo is gone for good, so its thumbnail can be released.
      if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl);
      if (photo.id) {
        try {
          await fetch(`/api/photos/${photo.id}`, { method: "DELETE" });
        } catch {
          // The row is orphaned at worst; it never reaches an appraiser.
        }
      }
    },
    [setPhotos],
  );

  const onFiles = useCallback(
    async (slot: string, files: FileList | null) => {
      if (!files || files.length === 0) return;
      setGlobalError(null);

      const spec = PHOTO_SLOTS.find((s) => s.slot === slot);
      const allowMultiple = "multiple" in spec! && spec.multiple;

      // Replacing a single-photo slot drops the old one first.
      if (!allowMultiple) {
        const existing = photos.filter((p) => p.slot === slot);
        for (const old of existing) await remove(old);
      }

      const list = Array.from(files).slice(0, allowMultiple ? 6 : 1);
      await withConcurrency(
        list.map((file) => () => upload(slot, file)),
        3,
      );
    },
    [photos, upload, remove],
  );

  const doneCount = photos.filter((p) => p.status === "done").length;
  const requiredDone = REQUIRED_SLOTS.filter((s) =>
    photos.some((p) => p.slot === s && p.status === "done"),
  ).length;
  const totalSaved = photos.reduce((sum, p) => sum + (p.savedBytes ?? 0), 0);

  const carSlots = PHOTO_SLOTS.filter((s) => !("isDocument" in s && s.isDocument));
  const docSlots = PHOTO_SLOTS.filter((s) => "isDocument" in s && s.isDocument);

  return (
    <>
      <StepHeading
        title="Show us the car"
        description="Daylight, clean background, whole car in frame. Your phone resizes each photo before it uploads, so this is quick even on mobile data."
      >
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold ring-1 ring-ink-200">
            <span
              className={
                requiredDone === REQUIRED_SLOTS.length
                  ? "text-[var(--color-ok)]"
                  : "text-ink-600"
              }
            >
              {requiredDone} of {REQUIRED_SLOTS.length} required done
            </span>
          </div>
          {totalSaved > 1024 * 100 ? (
            <span className="text-xs text-ink-500">
              {formatBytes(totalSaved)} of data saved by resizing
            </span>
          ) : null}
        </div>
      </StepHeading>

      {globalError ? (
        <div className="mb-5">
          <Alert tone="danger">{globalError}</Alert>
        </div>
      ) : null}

      <Panel>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-ink-500">
          The vehicle
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {carSlots.map((spec) => (
            <SlotCard
              key={spec.slot}
              spec={spec}
              photos={photos.filter((p) => p.slot === spec.slot)}
              onFiles={onFiles}
              onRemove={remove}
            />
          ))}
        </div>
      </Panel>

      <Panel className="mt-5">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-ink-500">
          Your papers
        </h2>
        <p className="mb-4 text-xs text-ink-500">
          These stay private. Only the appraiser handling your unit can open
          them.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {docSlots.map((spec) => (
            <SlotCard
              key={spec.slot}
              spec={spec}
              photos={photos.filter((p) => p.slot === spec.slot)}
              onFiles={onFiles}
              onRemove={remove}
            />
          ))}
        </div>
      </Panel>

      {doneCount > 0 ? (
        <p className="mt-4 text-center text-xs text-ink-500">
          {doneCount} photo{doneCount === 1 ? "" : "s"} uploaded
        </p>
      ) : null}
    </>
  );
}

function SlotCard({
  spec,
  photos,
  onFiles,
  onRemove,
}: {
  spec: PhotoSlotSpec;
  photos: UploadedPhoto[];
  onFiles: (slot: string, files: FileList | null) => void;
  onRemove: (photo: UploadedPhoto) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const multiple = "multiple" in spec && spec.multiple;
  const primary = photos[0];
  const filled = primary?.status === "done";
  const busy =
    primary?.status === "preparing" || primary?.status === "uploading";
  const failed = primary?.status === "error";

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={`${filled ? "Replace" : "Add"} photo: ${spec.label}`}
        className={`group relative block aspect-4/3 w-full overflow-hidden rounded-xl ring-1 ring-inset transition-all ${
          failed
            ? "bg-ml-red-50 ring-2 ring-ml-red-400"
            : filled
              ? "bg-ink-900 ring-ink-900"
              : "bg-ink-50 ring-dashed ring-ink-300 hover:bg-ink-100 hover:ring-ink-400"
        }`}
      >
        {primary?.previewUrl ? (
          // Local object URL — no network round trip for the thumbnail.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primary.previewUrl}
            alt=""
            className={`size-full object-cover transition-opacity ${
              busy ? "opacity-50" : "opacity-100"
            }`}
          />
        ) : (
          // The framing guide: a line drawing of the shot we're asking for.
          <span className="relative flex size-full items-center justify-center px-3 py-2">
            <SlotGuide
              slot={spec.slot}
              className="size-full text-ink-300 transition-colors group-hover:text-ml-red-300"
            />
            <span className="absolute bottom-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-white/80 text-ink-500 shadow-sm">
              <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden="true">
                <path
                  d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2a1 1 0 0 0 .8-.4l.9-1.2a1 1 0 0 1 .8-.4h3.6a1 1 0 0 1 .8.4l.9 1.2a1 1 0 0 0 .8.4h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <circle
                  cx="12"
                  cy="12.5"
                  r="3.2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
            </span>
          </span>
        )}

        {busy ? (
          <span className="absolute inset-x-2 bottom-2 h-1.5 overflow-hidden rounded-full bg-white/40">
            <span
              className="block h-full rounded-full bg-white transition-[width] duration-200"
              style={{ width: `${Math.max(primary.progress, 8)}%` }}
            />
          </span>
        ) : null}

        {filled ? (
          <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-white/95 shadow-sm">
            <svg
              viewBox="0 0 16 16"
              className="size-3.5 text-[var(--color-ok)]"
              aria-hidden="true"
            >
              <path
                d="m3.5 8.5 3 3 6-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ) : null}

        {multiple && photos.length > 1 ? (
          <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[0.7rem] font-bold text-white nums">
            {photos.length}
          </span>
        ) : null}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        capture={"isDocument" in spec && spec.isDocument ? undefined : "environment"}
        className="sr-only"
        onChange={(e) => {
          onFiles(spec.slot, e.target.files);
          e.target.value = "";
        }}
      />

      <div className="mt-1.5 px-0.5">
        <p className="flex items-center gap-1 text-xs font-semibold text-ink-800">
          {spec.label}
          {spec.required ? (
            <span className="text-ml-red-600" aria-label="required">
              *
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[0.7rem] leading-snug text-ink-500">
          {failed ? primary.error : spec.hint}
        </p>
        {filled ? (
          <button
            type="button"
            onClick={() => onRemove(primary)}
            className="mt-1 text-[0.7rem] font-semibold text-ml-red-600 hover:underline"
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * fetch() can't report upload progress, and a customer watching a still
 * thumbnail on a slow connection assumes it has hung. XHR gives us the bytes.
 */
function putWithProgress(
  target: { url: string; method: string; headers: Record<string, string> },
  blob: Blob,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(target.method, target.url, true);
    for (const [k, v] of Object.entries(target.headers)) {
      xhr.setRequestHeader(k, v);
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`upload ${xhr.status}`));
    xhr.onerror = () => reject(new Error("network"));
    xhr.ontimeout = () => reject(new Error("timeout"));
    xhr.timeout = 120_000;
    xhr.send(blob);
  });
}
