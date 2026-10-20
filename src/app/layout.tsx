import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "M Lhuillier AutoQuote — Sell your car, get an offer",
    template: "%s · M Lhuillier AutoQuote",
  },
  description:
    "Upload your vehicle details and photos and get a reviewed cash offer from M Lhuillier. Free, no obligation, and priced against live marketplace listings.",
  applicationName: "M Lhuillier AutoQuote",
  formatDetection: { telephone: true },
  openGraph: {
    type: "website",
    siteName: "M Lhuillier AutoQuote",
    title: "Sell your car to M Lhuillier",
    description:
      "Tell us about your car, upload a few photos, and our appraisers come back with a cash offer.",
  },
  robots: {
    // The staff portal and customer offer links must never be indexed.
    index: true,
    follow: true,
    nosnippet: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#c8120c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-PH">
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
