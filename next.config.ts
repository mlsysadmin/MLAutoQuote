import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone — a self-contained server with only the modules it
  // actually uses. Keeps the Cloud Run image small and cold starts short.
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,

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
        ],
      },
    ];
  },
};

export default nextConfig;
