"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";

/**
 * The customer's email, editable in place.
 *
 * Most customers skip it and some mistype it, and without an address the offer
 * email has nowhere to go. The appraiser is usually on the phone to them, so
 * this is the one moment it can realistically be fixed.
 */
export function EditableEmail({
  submissionId,
  email,
}: {
  submissionId: string;
  email: string | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(email ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/staff/submissions/${submissionId}/contact`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerEmail: value.trim() || null }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          fields?: Record<string, string>;
        };
        setError(body.fields?.customerEmail ?? body.error ?? "Couldn't save.");
        return;
      }
      setEditing(false);
      startTransition(() => router.refresh());
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className={email ? "" : "text-ink-400"}>{email ?? "—"}</span>
        <button
          type="button"
          onClick={() => {
            setValue(email ?? "");
            setError(null);
            setEditing(true);
          }}
          className="text-xs font-semibold text-ml-red-600 hover:underline"
        >
          {email ? "Edit" : "Add"}
        </button>
      </span>
    );
  }

  return (
    <span className="flex flex-col items-end gap-1.5">
      <span className="flex items-center gap-1.5">
        <Input
          type="email"
          value={value}
          autoFocus
          invalid={Boolean(error)}
          placeholder="juan@example.com"
          className="!w-56 !py-1.5 !text-sm"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <Button size="sm" loading={busy} onClick={save}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </span>
      {error ? (
        <span role="alert" className="text-xs font-medium text-ml-red-700">
          {error}
        </span>
      ) : null}
    </span>
  );
}
