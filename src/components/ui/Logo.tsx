import Image from "next/image";

/**
 * Brand lockup: the official M Lhuillier wordmark, with the product name
 * beneath it.
 *
 * `public/brand/ml-logo.svg` is the artwork mlhuillier.com itself serves
 * (`ml-logo-2.svg`), copied unaltered — a high-resolution bitmap wrapped in
 * SVG. It is deliberately not redrawn as vector: a financial brand's mark is
 * not something to approximate, and a trace that is a few degrees off reads as
 * wrong to anyone who knows it.
 *
 * It is referenced as a file rather than inlined, so the embedded raster never
 * passes through JSX and the browser can cache it once for every page.
 */
export function Logo({
  className = "",
  mono = false,
  showProduct = true,
}: {
  className?: string;
  /**
   * For dark or red surfaces. M Lhuillier publish no inverted artwork, so the
   * unaltered mark sits on a white chip rather than being recoloured.
   */
  mono?: boolean;
  showProduct?: boolean;
}) {
  return (
    <span className={`inline-flex flex-col leading-none ${className}`}>
      <span
        className={
          mono ? "rounded-md bg-white px-2.5 py-1.5" : undefined
        }
      >
        <Image
          src="/brand/ml-logo.svg"
          alt="M Lhuillier"
          width={248}
          height={44}
          // An SVG is served as-is; the optimizer has nothing to add.
          unoptimized
          className="h-[1.55rem] w-auto"
        />
      </span>
      {showProduct ? (
        <span
          className={`mt-[0.3rem] text-[0.6rem] font-semibold uppercase tracking-[0.26em] ${
            mono ? "text-white" : "text-ml-red-500"
          }`}
        >
          AutoQuote
        </span>
      ) : null}
    </span>
  );
}
