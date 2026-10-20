"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-xl " +
  "transition-[background-color,box-shadow,transform] duration-150 " +
  "active:translate-y-px disabled:opacity-50 disabled:pointer-events-none " +
  "select-none whitespace-nowrap";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-ml-red-600 text-white shadow-sm hover:bg-ml-red-700 " +
    "shadow-ml-red-900/10 hover:shadow-md",
  secondary:
    "bg-white text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 hover:ring-ink-300",
  ghost: "text-ink-700 hover:bg-ink-100",
  danger: "bg-white text-ml-red-700 ring-1 ring-inset ring-ml-red-200 hover:bg-ml-red-50",
  gold: "bg-ml-gold-400 text-ink-950 hover:bg-ml-gold-300 shadow-sm",
};

const SIZES: Record<Size, string> = {
  sm: "text-sm px-3 py-1.5",
  md: "text-[0.9375rem] px-4 py-2.5",
  lg: "text-base px-6 py-3.5",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className = "",
  children,
  disabled,
  ...rest
}: CommonProps & ComponentProps<"button">) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  icon,
  className = "",
  children,
  ...rest
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link
      {...rest}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {icon}
      {children}
    </Link>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`size-4 animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
