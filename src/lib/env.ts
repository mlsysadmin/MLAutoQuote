/**
 * Environment access, read once and validated at first use.
 *
 * Anything missing in production fails loudly here rather than halfway through a
 * customer's submission.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. See .env.example.`,
    );
  }
  return value;
}

const isProd = process.env.NODE_ENV === "production";

export const env = {
  isProd,

  databaseUrl: process.env.DATABASE_URL ?? "",

  /**
   * Development convenience: lets staff sign in with the password box empty,
   * so nobody has to type one while building or demonstrating the portal.
   *
   * Returns false in production regardless of what the environment says, so a
   * stray variable in a deploy can never switch it on there.
   */
  get allowBlankStaffPassword(): boolean {
    if (isProd) return false;
    return process.env.AUTH_ALLOW_BLANK_PASSWORD === "true";
  },

  get sessionSecret(): string {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) {
      if (isProd) {
        throw new Error(
          "SESSION_SECRET must be set to at least 32 characters in production.",
        );
      }
      // Dev convenience only — sessions reset whenever the server restarts.
      return "dev-only-insecure-session-secret-value-0001";
    }
    return secret;
  },

  /**
   * The site's public origin.
   *
   * `NEXT_PUBLIC_*` values are inlined into the bundle at build time, so on
   * their own they would bake whatever the builder happened to have — which on
   * Cloud Build is nothing, and a sitemap full of localhost URLs. `APP_URL` is
   * an ordinary server variable, readable at runtime, and takes precedence
   * wherever the value is needed at request time (robots, sitemap).
   *
   * Statically rendered canonicals still resolve at build time, so
   * NEXT_PUBLIC_APP_URL must also be passed as a Docker build argument. See
   * DEPLOYMENT.md.
   */
  get appUrl(): string {
    return (
      process.env.APP_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000"
    );
  },

  storage: {
    driver: (process.env.STORAGE_DRIVER ?? "local") as "local" | "gcs",
    get bucket(): string {
      return required("GCS_BUCKET", process.env.GCS_BUCKET);
    },
    signerEmail: process.env.GCS_SIGNER_EMAIL || undefined,
  },

  comparables: {
    providers: (process.env.COMPARABLES_PROVIDERS ?? "manual,seed")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    apiUrl: process.env.COMPARABLES_API_URL || "",
    apiKey: process.env.COMPARABLES_API_KEY || "",
    ingestToken: process.env.COMPARABLES_INGEST_TOKEN || "",
  },

  valuation: {
    buyMargin: numberFrom(process.env.VALUATION_BUY_MARGIN, 0.82),
    offerValidityDays: Math.round(
      numberFrom(process.env.OFFER_VALIDITY_DAYS, 7),
    ),
  },
};

function numberFrom(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
