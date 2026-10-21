import type {
  ExtractedIdentity,
  IdExtractionInput,
  IdExtractionProvider,
} from "./types";
import { parsePhilippineId } from "./parse-ph-id";

/**
 * Google Cloud Vision OCR, then our own Philippine-ID parser over the text.
 *
 * The appeal is that the image never leaves the customer's own cloud project:
 * Vision runs inside the same GCP account the app is deployed to, which is the
 * easiest answer to "where do our customers' ID scans go?".
 *
 * Enable with:
 *   gcloud services enable vision.googleapis.com
 * The Cloud Run service account needs no extra role — Vision accepts the
 * project's default credentials.
 */
export class GoogleVisionProvider implements IdExtractionProvider {
  readonly id = "vision";
  readonly label = "Cloud Vision OCR";

  isEnabled(): boolean {
    return process.env.ID_EXTRACTION_PROVIDER === "vision";
  }

  async read(input: IdExtractionInput): Promise<ExtractedIdentity | null> {
    const key = process.env.GOOGLE_VISION_API_KEY;
    const endpoint = key
      ? `https://vision.googleapis.com/v1/images:annotate?key=${key}`
      : "https://vision.googleapis.com/v1/images:annotate";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Without an API key, authenticate as the attached service account.
    if (!key) {
      const token = await accessToken();
      if (!token) {
        console.error("vision: no API key and no service-account token");
        return null;
      }
      headers.Authorization = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          requests: [
            {
              image: { content: input.image.toString("base64") },
              features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
              imageContext: { languageHints: ["en", "fil"] },
            },
          ],
        }),
      });

      if (!res.ok) {
        console.error("vision responded", res.status, await res.text());
        return null;
      }

      const body = (await res.json()) as {
        responses?: Array<{ fullTextAnnotation?: { text?: string } }>;
      };
      const text = body.responses?.[0]?.fullTextAnnotation?.text;
      if (!text) return null;

      const parsed = parsePhilippineId(text);
      return { ...parsed, provider: this.id, raw: text };
    } catch (err) {
      console.error("vision request failed", err);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}

/**
 * An access token from the Cloud Run metadata server. Present on GCP, absent
 * on a laptop — which is why local development uses an API key instead.
 */
async function accessToken(): Promise<string | null> {
  try {
    const res = await fetch(
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
      { headers: { "Metadata-Flavor": "Google" }, cache: "no-store" },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { access_token?: string };
    return body.access_token ?? null;
  } catch {
    return null;
  }
}
