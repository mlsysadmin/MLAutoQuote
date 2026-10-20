"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  buttonClass,
  type ButtonSize,
  type ButtonVariant,
} from "./button-styles";

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className = "",
  children,
  disabled,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
} & ComponentProps<"button">) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
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
