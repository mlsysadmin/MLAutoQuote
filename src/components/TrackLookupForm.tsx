"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Input } from "@/components/ui";
import { toNationalDigits, toStoredPhone } from "@/lib/phone";

export function TrackLookupForm() {
  const router = useRouter();
  const [refCode, setRefCode] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/track/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refCode, phone: toStoredPhone(phone) }),
      });
      const body = (await res.json()) as {
        publicToken?: string;
        error?: string;
      };

      if (!res.ok || !body.publicToken) {
        setError(body.error ?? "We couldn't find that.");
        setBusy(false);
        return;
      }

      router.push(`/track/${body.publicToken}`);
    } catch {
      setError("We couldn't reach the server. Check your connection.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Field
        label="Reference code"
        required
        hint="On your confirmation, like MLA-7K3QD2."
      >
        {({ id }) => (
          <Input
            id={id}
            value={refCode}
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="MLA-7K3QD2"
            className="font-mono uppercase tracking-wider"
            onChange={(e) => setRefCode(e.target.value.toUpperCase())}
          />
        )}
      </Field>

      {/* Same fixed +63 as the form they filled in, so the number they type
          here looks like the number they gave us. The lookup normalises both
          sides anyway, so an older 09… record still matches. */}
      <Field label="Mobile number" required>
        {({ id }) => (
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-500 nums">
              +63
            </span>
            <Input
              id={id}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phone}
              placeholder="917 123 4567"
              className="nums pl-13"
              onChange={(e) => setPhone(toNationalDigits(e.target.value))}
            />
          </div>
        )}
      </Field>

      <Button type="submit" size="lg" loading={busy} className="w-full">
        Find my offer
      </Button>
    </form>
  );
}
