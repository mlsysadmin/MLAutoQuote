"use client";

import { useCallback, useEffect, useState } from "react";

type Photo = {
  id: string;
  slot: string;
  label: string;
  url: string;
  width: number | null;
  height: number | null;
};

/**
 * Appraisers work through photos in sequence, so the lightbox is keyboard
 * driven: arrows move, Escape closes. Thumbnails load lazily — a submission
 * with forty photos shouldn't cost forty requests before the page is usable.
 */
export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const move = useCallback(
    (delta: number) => {
      setOpenIndex((current) => {
        if (current === null) return null;
        return (current + delta + photos.length) % photos.length;
      });
    },
    [photos.length],
  );

  useEffect(() => {
    if (openIndex === null) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [openIndex, move]);

  const open = openIndex === null ? null : photos[openIndex];

  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {photos.map((photo, i) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              className="group block w-full overflow-hidden rounded-xl bg-ink-100 ring-1 ring-ink-200 transition-all hover:ring-2 hover:ring-ml-red-400"
            >
              <span className="block aspect-4/3 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.label}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </span>
              <span className="block truncate px-2 py-1.5 text-[0.7rem] font-semibold text-ink-700">
                {photo.label}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={open.label}
          className="fixed inset-0 z-50 flex flex-col bg-ink-950/95 backdrop-blur-sm"
          onClick={() => setOpenIndex(null)}
        >
          <div className="flex items-center justify-between gap-4 px-4 py-3 text-white">
            <div>
              <p className="font-semibold">{open.label}</p>
              <p className="text-xs text-white/60 nums">
                {(openIndex ?? 0) + 1} of {photos.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={open.url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20"
              >
                Open full size
              </a>
              <button
                type="button"
                onClick={() => setOpenIndex(null)}
                aria-label="Close"
                className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>

          <div
            className="flex flex-1 items-center justify-center px-4 pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => move(-1)}
              className="mr-2 shrink-0 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            >
              <Chevron direction="left" />
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={open.url}
              alt={open.label}
              className="max-h-[80vh] min-h-0 flex-1 object-contain"
            />

            <button
              type="button"
              aria-label="Next photo"
              onClick={() => move(1)}
              className="ml-2 shrink-0 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            >
              <Chevron direction="right" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
