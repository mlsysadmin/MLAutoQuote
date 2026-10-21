/**
 * The company name as it appears in running text, always in the brand red so
 * "M Lhuillier" reads as the mark it is rather than as ordinary prose.
 *
 * #E00000 clears 5.0:1 on white, so this is safe at body size. It is not safe
 * on the dark surfaces — there the name stays in the inherited white.
 */
export function Brand({ className = "" }: { className?: string }) {
  return (
    <span className={`font-semibold text-ml-red-500 ${className}`}>
      M&nbsp;Lhuillier
    </span>
  );
}
