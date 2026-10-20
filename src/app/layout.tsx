import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { env } from "@/lib/env";
import { organisationJsonLd, websiteJsonLd } from "@/lib/seo";
import "./globals.css";

/**
 * Poppins is the typeface mlhuillier.com uses. `next/font` downloads it at
 * build time and serves it from our own origin, so matching the brand costs no
 * extra DNS lookup or connection on a phone — three weights, latin only.
 */
const poppins = Poppins({
  subsets: ["latin"],
  // 400 for body copy, 600 for labels and buttons, 700 for headings. Without
  // 400 the browser snapped paragraphs to the nearest available weight and
  // rendered the whole page a shade too heavy.
  weight: ["400", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
  // Preloading made the browser fetch each weight twice — once from the
  // preload hint and again from the stylesheet — 39 KB instead of 15 on a
  // phone. Without it the text paints immediately in the fallback stack and
  // swaps to Poppins when it lands, which is the better trade on mobile data.
  preload: false,
  adjustFontFallback: true,
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: "Sell Your Car for Cash | M Lhuillier AutoQuote Philippines",
    template: "%s | M Lhuillier AutoQuote",
  },
  description:
    "Get a free cash offer for your car in 24 hours. Upload your details and photos from your phone, we price it against live marketplace listings, and a licensed appraiser reviews every offer. No obligation.",
  applicationName: "M Lhuillier AutoQuote",
  referrer: "strict-origin-when-cross-origin",
  authors: [{ name: "M Lhuillier" }],
  creator: "M Lhuillier",
  publisher: "M Lhuillier",
  formatDetection: { telephone: true, address: false, email: false },
  alternates: { canonical: "/" },
  keywords: [
    "sell my car Philippines",
    "sell used car for cash",
    "car appraisal Philippines",
    "second hand car buyer",
    "how much is my car worth",
    "M Lhuillier",
  ],
  openGraph: {
    type: "website",
    locale: "en_PH",
    url: "/",
    siteName: "M Lhuillier AutoQuote",
    title: "Sell your car to M Lhuillier — a real offer in 24 hours",
    description:
      "Tell us about your car, upload a few photos, and our appraisers come back with a cash offer priced against live marketplace listings.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sell your car to M Lhuillier",
    description:
      "A free, no-obligation cash offer for your car, reviewed by a licensed appraiser.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "finance",
};

export const viewport: Viewport = {
  themeColor: "#ff5f00",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-PH" className={poppins.variable}>
      <body className="min-h-dvh antialiased">
        {/* Identity and site search, so Google can show a sitelinks box. */}
        <script
          type="application/ld+json"
          // The payload is built from our own constants, never user input.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organisationJsonLd(), websiteJsonLd()]),
          }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink-900 focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
