import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import {
  buttonClass,
  type ButtonSize,
  type ButtonVariant,
} from "./button-styles";

/**
 * A button-shaped link. No "use client" on purpose — this is the only button
 * the landing page uses, so that page ships zero client JavaScript.
 */
export function ButtonLink({
  variant = "primary",
  size = "md",
  icon,
  className = "",
  children,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
} & ComponentProps<typeof Link>) {
  return (
    <Link {...rest} className={buttonClass(variant, size, className)}>
      {icon}
      {children}
    </Link>
  );
}
