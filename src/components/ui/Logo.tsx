/**
 * Brand lockup, in the shape mlhuillier.com uses: "M◆LHUILLIER" set tight in
 * the brand red, with the product name beneath.
 *
 * Drawn as text plus one tiny inline diamond rather than the official artwork —
 * that file is a 45 KB bitmap wrapped in SVG, which would cost more to load
 * than the rest of the page. If you want the exact asset, drop it in
 * public/brand/ and swap the markup here; nothing else references it.
 */
export function Logo({
  className = "",
  mono = false,
  showProduct = true,
}: {
  className?: string;
  /** White treatment, for dark or orange surfaces. */
  mono?: boolean;
  showProduct?: boolean;
}) {
  const ink = mono ? "text-white" : "text-ml-red-700";

  return (
    <span className={`inline-flex flex-col leading-none ${className}`}>
      <span
        className={`flex items-center text-[1.3rem] font-bold tracking-[-0.01em] ${ink}`}
        aria-label="M Lhuillier"
      >
        M
        <svg
          viewBox="0 0 20 20"
          className="mx-[0.06em] size-[0.72em]"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M10 1.6 18.4 10 10 18.4 1.6 10z"
            fill="currentColor"
          />
          <path d="M10 4.6 15.4 10 10 15.4 4.6 10z" fill="#ffffff" opacity=".28" />
        </svg>
        LHUILLIER
      </span>
      {showProduct ? (
        <span
          className={`mt-[0.22em] text-[0.6rem] font-semibold uppercase tracking-[0.26em] ${
            mono ? "text-white/80" : "text-ml-orange-600"
          }`}
        >
          AutoQuote
        </span>
      ) : null}
    </span>
  );
}
