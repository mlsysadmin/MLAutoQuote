import type { ReactNode } from "react";

/**
 * A card, in the shape mlhuillier.com uses: white, 20px corners, and a soft
 * resting shadow rather than a border. Cards are meant to sit on the #F5F5F5
 * section background, which is what gives them their lift.
 */
export function Card({
  children,
  className = "",
  as: Tag = "div",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "aside";
  /** Adds the hover lift — only for cards that are themselves a link. */
  interactive?: boolean;
}) {
  return (
    <Tag
      className={`rounded-[20px] bg-white shadow-[0_4px_12px_rgb(0_0_0/0.08)] ${
        interactive
          ? "transition-shadow duration-200 hover:shadow-[0_10px_30px_rgb(0_0_0/0.15)]"
          : ""
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 border-b border-ink-200/70 px-5 py-4 sm:px-6 ${className}`}
    >
      <div className="min-w-0">
        <h2 className="text-base font-bold text-ink-900">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-ink-600">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`px-5 py-5 sm:px-6 ${className}`}>{children}</div>;
}

export function Divider({ className = "" }: { className?: string }) {
  return <hr className={`border-ink-200/70 ${className}`} />;
}

/** Label/value row used throughout the staff detail pages. */
export function DataRow({
  label,
  value,
  hint,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-ink-600">{label}</dt>
      <dd className="text-right text-sm font-semibold text-ink-900">
        {value}
        {hint ? (
          <span className="ml-2 font-normal text-ink-500">{hint}</span>
        ) : null}
      </dd>
    </div>
  );
}
