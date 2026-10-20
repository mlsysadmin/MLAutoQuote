"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Input } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});

    try {
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = (await res.json()) as {
        error?: string;
        fields?: Record<string, string>;
      };

      if (!res.ok) {
        setError(body.error ?? "Sign in failed.");
        setFields(body.fields ?? {});
        setBusy(false);
        return;
      }

      router.replace("/staff");
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Check your connection.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Field label="Work email" required error={fields.email}>
        {({ id, invalid }) => (
          <Input
            id={id}
            invalid={invalid}
            type="email"
            autoComplete="username"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </Field>

      <Field label="Password" required error={fields.password}>
        {({ id, invalid }) => (
          <Input
            id={id}
            invalid={invalid}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
      </Field>

      <Button type="submit" loading={busy} size="lg" className="w-full">
        Sign in
      </Button>
    </form>
  );
}
