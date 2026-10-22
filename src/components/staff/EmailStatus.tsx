"use client";

import { useState } from "react";
import { Alert, Button, Input } from "@/components/ui";

/**
 * Whether offers are actually reaching customers, and a way to find out.
 *
 * This panel exists because of a failure mode with no symptoms: with no mail
 * server configured the app logs the message and carries on, so an appraiser
 * releases an offer, the submission says "Offer sent", and the customer never
 * hears anything. Nothing in the app looks wrong. So the state is stated
 * plainly here, and there is a button that proves it either way.
 */
const TRANSPORT_LABEL: Record<string, string> = {
  api: "Sending service connected",
  smtp: "Mail server connected",
  webhook: "Webhook connected",
  none: "Not sending",
};

export function EmailStatus({
  transport,
  from,
  defaultTo,
}: {
  transport: "api" | "smtp" | "webhook" | "none";
  from: string;
  defaultTo: string;
}) {
  const [to, setTo] = useState(defaultTo);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<
    { ok: boolean; message: string } | null
  >(null);

  async function send() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/staff/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        to?: string;
      };

      setResult(
        res.ok && body.ok
          ? { ok: true, message: `Sent to ${body.to}. Check that inbox — and the spam folder.` }
          : { ok: false, message: body.error ?? "That didn't send." },
      );
    } catch {
      setResult({ ok: false, message: "We couldn't reach the server." });
    }
    setBusy(false);
  }

  const live = transport !== "none";

  return (
    <div className="rounded-[20px] bg-white p-5 shadow-[0_4px_12px_rgb(0_0_0/0.08)] sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-ink-900">Customer email</h2>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            live
              ? "bg-[var(--color-ok-bg)] text-[var(--color-ok)]"
              : "bg-ml-red-50 text-ml-red-700"
          }`}
        >
          {live ? TRANSPORT_LABEL[transport] : "Not sending"}
        </span>
      </div>

      {live ? (
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Offers go out from <strong className="font-semibold">{from}</strong>.
          Send yourself a test to be sure it lands.
        </p>
      ) : (
        <div className="mt-3">
          <Alert tone="danger" title="Offers are not reaching customers">
            Every offer email is written to the server log instead of being
            delivered, and nothing else in the app says so — a released offer
            still reads &ldquo;Offer sent&rdquo;. The quickest fix is an{" "}
            <code>EMAIL_API_KEY</code> from a sending service; a mail server
            (<code>SMTP_HOST</code>) works too.
          </Alert>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="min-w-[14rem] flex-1">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-500">
            Send a test to
          </span>
          <Input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="you@example.com"
            className="mt-2"
          />
        </label>
        <Button onClick={send} loading={busy} disabled={!live || !to}>
          Send test
        </Button>
      </div>

      {result ? (
        <div className="mt-4">
          <Alert tone={result.ok ? "ok" : "danger"}>{result.message}</Alert>
        </div>
      ) : null}
    </div>
  );
}
