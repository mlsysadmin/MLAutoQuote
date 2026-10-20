/**
 * Brand lockup.
 *
 * The monogram here is a stand-in built from the brand colours — drop the
 * official M Lhuillier artwork into /public/brand/logo.svg and swap the <svg>
 * for an <Image>, and nothing else in the app needs to change.
 */
export function Logo({
  className = "",
  mono = false,
}: {
  className?: string;
  /** White-on-red treatment for the dark header. */
  mono?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 40 40"
        className="size-9 shrink-0"
        role="img"
        aria-label="M Lhuillier"
      >
        <rect
          width="40"
          height="40"
          rx="10"
          fill={mono ? "#ffffff" : "var(--color-ml-red-600)"}
        />
        <path
          d="M9 28V12h4.2l4.3 8.1 4.3-8.1H26v16h-3.6v-9.6l-3.6 6.7h-2.3l-3.6-6.7V28H9Z"
          fill={mono ? "var(--color-ml-red-600)" : "#ffffff"}
        />
        <path
          d="M28.2 28V12H31v13.2h5.2V28h-8Z"
          fill="var(--color-ml-gold-400)"
        />
      </svg>
      <span className="flex min-w-0 flex-col leading-none">
        <span
          className={`text-[0.95rem] font-extrabold tracking-tight ${
            mono ? "text-white" : "text-ink-900"
          }`}
        >
          M Lhuillier
        </span>
        <span
          className={`mt-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] ${
            mono ? "text-ml-gold-300" : "text-ml-red-600"
          }`}
        >
          AutoQuote
        </span>
      </span>
    </span>
  );
}
