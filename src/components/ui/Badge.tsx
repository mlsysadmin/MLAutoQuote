import type { ReactNode } from "react";
import type { OfferStatus, SubmissionStatus } from "@prisma/client";

type Tone = "neutral" | "ok" | "warn" | "danger" | "info" | "gold";

const TONES: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700 ring-ink-200",
  ok: "bg-[var(--color-ok-bg)] text-[var(--color-ok)] ring-green-200",
  warn: "bg-[var(--color-warn-bg)] text-[var(--color-warn)] ring-amber-200",
  danger: "bg-ml-red-50 text-ml-red-700 ring-ml-red-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
  gold: "bg-ml-orange-100 text-ml-orange-800 ring-ml-orange-300",
};

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

const SUBMISSION_LABELS: Record<SubmissionStatus, { label: string; tone: Tone }> =
  {
    DRAFT: { label: "Draft", tone: "neutral" },
    SUBMITTED: { label: "Submitted", tone: "info" },
    IN_REVIEW: { label: "Awaiting appraiser", tone: "warn" },
    OFFER_SENT: { label: "Offer sent", tone: "gold" },
    ACCEPTED: { label: "Accepted", tone: "ok" },
    DECLINED: { label: "Declined", tone: "danger" },
    EXPIRED: { label: "Expired", tone: "neutral" },
    ARCHIVED: { label: "Archived", tone: "neutral" },
  };

export function SubmissionBadge({ status }: { status: SubmissionStatus }) {
  const { label, tone } = SUBMISSION_LABELS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

const OFFER_LABELS: Record<OfferStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  PENDING_REVIEW: { label: "Pending review", tone: "warn" },
  SENT: { label: "Sent to customer", tone: "gold" },
  ACCEPTED: { label: "Accepted", tone: "ok" },
  DECLINED: { label: "Declined", tone: "danger" },
  EXPIRED: { label: "Expired", tone: "neutral" },
  SUPERSEDED: { label: "Superseded", tone: "neutral" },
};

export function OfferBadge({ status }: { status: OfferStatus }) {
  const { label, tone } = OFFER_LABELS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: Tone;
  title?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-xl px-4 py-3 text-sm ring-1 ring-inset ${TONES[tone]}`}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? "mt-1 opacity-90" : ""}>{children}</div>
    </div>
  );
}
