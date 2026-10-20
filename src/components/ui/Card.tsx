import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "aside";
}) {
  return (
    <Tag
      className={`rounded-2xl bg-white ring-1 ring-ink-200/70 shadow-[0_1px_2px_rgb(31_29_27/0.04),0_4px_16px_rgb(31_29_27/0.05)] ${className}`}
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
      className={`flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4 sm:px-6 ${className}`}
    >
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
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
  return <hr className={`border-ink-100 ${className}`} />;
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
      <dd className="text-right text-sm font-medium text-ink-900">
        {value}
        {hint ? (
          <span className="ml-2 font-normal text-ink-500">{hint}</span>
        ) : null}
      </dd>
    </div>
  );
}
