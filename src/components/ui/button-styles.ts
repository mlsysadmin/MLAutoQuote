/**
 * Shared button styling.
 *
 * Lives apart from the components so the link variant can stay a server
 * component — a styled `<Link>` needs no JavaScript, and keeping it off the
 * client bundle is most of what makes the landing page cheap on a phone.
 *
 * Shapes follow mlhuillier.com: pills, 500–600 weight, generous horizontal
 * padding.
 */

export type ButtonVariant =
  | "cta"
  | "primary"
  | "secondary"
  | "ghost"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold " +
  "transition-[background-color,box-shadow,transform] duration-150 " +
  "active:translate-y-px disabled:opacity-50 disabled:pointer-events-none " +
  "select-none whitespace-nowrap";

/**
 * `cta` is the brand orange and is only ever used at `lg`, where white on
 * #FF5F00 clears the 3:1 large-text bar. Everything smaller uses charcoal,
 * which is what the main site reaches for anyway and clears 12.6:1.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  cta: "bg-ml-orange-500 text-white shadow-sm hover:bg-ml-orange-600 hover:shadow-md",
  primary: "bg-ink-800 text-white hover:bg-ink-900",
  secondary:
    "bg-white text-ink-700 ring-1 ring-inset ring-ink-300 hover:bg-ink-50 hover:text-ink-900",
  ghost: "text-ink-700 hover:bg-ink-100",
  danger:
    "bg-white text-ml-red-700 ring-1 ring-inset ring-ml-red-200 hover:bg-ml-red-50",
};

/** Minimum 44px tall from `md` up — a comfortable thumb target. */
const SIZES: Record<ButtonSize, string> = {
  sm: "text-sm px-5 py-2",
  md: "text-[0.9375rem] px-7 py-2.5 min-h-11",
  lg: "text-[1.0625rem] px-8 py-3.5 min-h-[52px]",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = "",
): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}
