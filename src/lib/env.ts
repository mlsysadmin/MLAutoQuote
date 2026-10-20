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

  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

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
