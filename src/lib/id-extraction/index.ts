import "server-only";

import type { ExtractedIdentity, IdExtractionProvider } from "./types";
import { ClaudeVisionProvider } from "./claude-vision";
import { GoogleVisionProvider } from "./google-vision";

export * from "./types";
export { parsePhilippineId } from "./parse-ph-id";

/**
 * Reading a customer's details off the ID they already uploaded, so the last
 * step of the wizard is one field instead of five.
 *
 * `ID_EXTRACTION_PROVIDER` picks the reader:
 *   "vision" — Google Cloud Vision OCR. The image stays inside your own GCP
 *              project, which is the simplest answer to where customers' ID
 *              scans go.
 *   "claude" — a vision model. Markedly better on creased, angled or glared
 *              cards, at the cost of sending the image to a third party.
 *   unset    — off. The form behaves exactly as it did before; the customer
 *              types the five fields.
 *
 * Whatever comes back is a suggestion the customer confirms, never a fact.
 */
const REGISTRY: Record<string, () => IdExtractionProvider> = {
  vision: () => new GoogleVisionProvider(),
  claude: () => new ClaudeVisionProvider(),
};

export function activeProvider(): IdExtractionProvider | null {
  const configured = process.env.ID_EXTRACTION_PROVIDER;
  if (!configured) return null;

  const provider = REGISTRY[configured]?.();
  if (!provider) {
    console.error(`unknown ID_EXTRACTION_PROVIDER: ${configured}`);
    return null;
  }
  return provider.isEnabled() ? provider : null;
}

export function isIdExtractionEnabled(): boolean {
  return activeProvider() !== null;
}

/**
 * Below this, a read is too unreliable to put in front of someone — the fields
 * would cost more to check than to type. We keep quiet instead.
 */
const MINIMUM_CONFIDENCE = 0.35;

export async function readIdPhoto(
  image: Buffer,
  contentType: string,
): Promise<ExtractedIdentity | null> {
  const provider = activeProvider();
  if (!provider) return null;

  const started = Date.now();
  const result = await provider.read({ image, contentType });
  const elapsed = Date.now() - started;

  if (!result) {
    console.info(`[id-extraction] ${provider.id} read nothing (${elapsed}ms)`);
    return null;
  }

  // Never log the values themselves — this is somebody's identity document.
  console.info(
    `[id-extraction] ${provider.id} filled ${result.filled.length}/4 ` +
      `at ${result.confidence.toFixed(2)} confidence (${elapsed}ms)`,
  );

  if (result.confidence < MINIMUM_CONFIDENCE || result.filled.length === 0) {
    return null;
  }

  // The raw text is for debugging a bad read locally; it must not travel.
  return { ...result, raw: undefined };
}
