"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is what ties this to a Cloud Logging entry.
    console.error("unhandled error", error.digest, error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink-50 px-4 py-16">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-extrabold text-ink-950">
          Something went wrong on our side
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-600">
          Your answers are saved. Try again in a moment — if it keeps happening,
          quote this code to our team.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-ink-500">{error.digest}</p>
        ) : null}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/" variant="secondary">
            Back to the start
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
