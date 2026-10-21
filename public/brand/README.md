# Brand assets

| File          | What it is                                                     |
| ------------- | -------------------------------------------------------------- |
| `ml-logo.svg` | The official M Lhuillier wordmark, copied unaltered from `https://mlhuillier.com/ml-logo-2.svg` (248×44; a 2986×529 PNG wrapped in SVG, ~45 KB) |

Rendered by [`src/components/ui/Logo.tsx`](../../src/components/ui/Logo.tsx).

**Use the real artwork, always.** Do not redraw, trace or approximate the mark,
and do not recolour it. M Lhuillier publish no inverted variant, so on a dark or
red surface the component puts the unaltered logo on a white chip (`mono`).

To refresh it after a rebrand, download the current file from the site and
overwrite `ml-logo.svg` — nothing else needs to change:

```bash
curl -o public/brand/ml-logo.svg https://mlhuillier.com/ml-logo-2.svg
```

## Colours

The palette lives as design tokens at the top of
[`src/app/globals.css`](../../src/app/globals.css). Replace the brand ramps
there with the exact values from the brand book and every screen follows; the
current reds are sampled from the official artwork.
