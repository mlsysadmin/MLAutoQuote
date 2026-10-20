# Brand assets

Drop the official M Lhuillier artwork here:

| File              | Used for                                               |
| ----------------- | ------------------------------------------------------ |
| `logo.svg`        | The header lockup                                       |
| `logo-mono.svg`   | White-on-red treatment for dark surfaces                |
| `hero.jpg`        | Optional hero photograph on the landing page            |

Then swap the inline `<svg>` in
[`src/components/ui/Logo.tsx`](../../src/components/ui/Logo.tsx) for:

```tsx
import Image from "next/image";

<Image src="/brand/logo.svg" alt="M Lhuillier" width={36} height={36} priority />
```

Nothing else in the app references the logo directly, so that one component is
the whole change.

The colour ramps live as design tokens at the top of
[`src/app/globals.css`](../../src/app/globals.css) — replace the three brand
ramps (`--color-ml-red-*`, `--color-ml-gold-*`, and the neutrals) with the exact
values from the brand book and every screen follows. The current values are
close approximations of the signal red and gold used on branch signage.
