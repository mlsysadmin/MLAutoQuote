import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content security policy.
 *
 * The job here is to make an injected script useless even if one ever lands:
 * it can't load code from anywhere, can't exfiltrate to another origin, and
 * can't frame the app inside someone else's page.
 *
 * Two concessions, both deliberate:
 *
 * - `'unsafe-inline'` for styles, because Tailwind and React both emit inline
 *   style attributes. Inline CSS cannot execute, so the risk is cosmetic.
 * - `'unsafe-eval'` in development only, which the dev server's hot reloading
 *   needs. Production gets neither it nor the websocket allowance.
 *
 * `img-src` has to admit blob: for the wizard's local thumbnails and
 * storage.googleapis.com for signed photo URLs.
 */
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://storage.googleapis.com https://*.googleusercontent.com",
  `connect-src 'self' https://storage.googleapis.com${isDev ? " ws: http:" : ""}`,
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  // Emits .next/standalone — a self-contained server with only the modules it
  // actually uses. Keeps the Cloud Run image small and cold starts short.
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,

  // In development Next refuses requests for /_next/* assets whose Host isn't
  // localhost, which leaves a page served over the LAN rendered but never
  // hydrated — the HTML arrives, the bundle 403s, and the app sits on its
  // loading skeleton for ever. These are the origins colleagues test from.
  //
  // Development only: `next build` ignores it, so it has no bearing on
  // Cloud Run. Set DEV_ORIGINS in .env (comma separated) when this machine's
  // DHCP address changes, rather than editing this file.
  allowedDevOrigins: [
    "10.0.7.41",
    ...(process.env.DEV_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ],

  // Tesseract (the no-credentials ID reader) starts a Node worker by resolving
  // a path inside its own package. Bundled, that path is rewritten to one that
  // doesn't exist and the worker dies on first use. Left external, it resolves
  // from node_modules the way it expects.
  serverExternalPackages: ["tesseract.js"],

  experimental: {
    // Ship less JS to the browser for the icon/util barrels we import.
    optimizePackageImports: ["@/components/ui"],
  },

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
    ],
  },

  async headers() {
    return [
      {
        // Uploaded photos are content-addressed, so they never change in place.
        source: "/api/uploads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(self)",
          },
          {
            // Tells browsers to reach this origin over HTTPS only, for two
            // years, after the first visit. Cloud Run terminates TLS, so the
            // app is always served over HTTPS in production.
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
