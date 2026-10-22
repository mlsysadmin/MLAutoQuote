import "server-only";

import type { ExtractedIdentity, IdExtractionProvider } from "./types";
import { ClaudeVisionProvider } from "./claude-vision";
import { GoogleVisionProvider } from "./google-vision";
import { LocalOcrProvider } from "./local-ocr";

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
 *   local  — Tesseract OCR in this process. No credentials, no outbound
 *              call; weaker on a glared phone snap than either of the above.
 *   unset    — pick whichever is available, best first: vision, claude, local.
 *              Since local always is, reading is on unless it is switched
 *              off explicitly.
 *
 * Whatever comes back is a suggestion the customer confirms, never a fact.
 */
const REGISTRY: Record<string, () => IdExtractionProvider> = {
  vision: () => new GoogleVisionProvider(),
  claude: () => new ClaudeVisionProvider(),
  local: () => new LocalOcrProvider(),
};

/**
 * Reading the ID is on whenever a reader is available.
 *
 * Asking someone to type a name, a birth date and an ID number off a card we
 * are already holding a photograph of is work we have no business asking for.
 * So the only question is which reader to use, not whether to read: with
 * nothing configured it picks whichever has credentials, and falls back to
 * typing only when neither does.
 *
 * `ID_EXTRACTION_PROVIDER=off` disables it outright, for a deployment that
 * would rather not send ID images anywhere — including its own Vision API.
 */
/**
 * Every reader this deployment can use, best first.
 *
 * Vision leads because it is accurate and keeps the image inside the project's
 * own cloud; then the vision model; then on-device OCR, which needs nothing
 * and so is always there. Naming a provider explicitly pins the list to that
 * one — if it has no credentials, nothing reads, which is what pinning means.
 */
export function providerChain(): IdExtractionProvider[] {
  const configured = process.env.ID_EXTRACTION_PROVIDER?.trim();

  if (configured === "off" || configured === "none") return [];

  if (configured) {
    const provider = REGISTRY[configured]?.();
    if (!provider) {
      console.error(`unknown ID_EXTRACTION_PROVIDER: ${configured}`);
      return [];
    }
    return provider.isEnabled() ? [provider] : [];
  }

  return [REGISTRY.vision, REGISTRY.claude, REGISTRY.local]
    .map((build) => build())
    .filter((provider) => provider.isEnabled());
}

export function activeProvider(): IdExtractionProvider | null {
  return providerChain()[0] ?? null;
}

export function isIdExtractionEnabled(): boolean {
  return providerChain().length > 0;
}

/**
 * Below this, a read is too unreliable to put in front of someone — the fields
 * would cost more to check than to type. We keep quiet instead.
 */
const MINIMUM_CONFIDENCE = 0.35;

/**
 * Reads the card with the best reader available, trying the next one when a
 * reader comes back empty.
 *
 * The fallback matters most on the day Vision is turned on: an unenabled API,
 * an expired key or a quota ceiling all look the same from here — no text —
 * and without a second attempt every customer would quietly go back to typing
 * their details while the logs filled with 403s. A reader that answers but
 * answers poorly is not retried: that is a judgement about the photograph, not
 * a failure, and asking a second service the same question costs money and
 * sends the ID somewhere else for nothing.
 */
export async function readIdPhoto(
  image: Buffer,
  contentType: string,
): Promise<ExtractedIdentity | null> {
  const chain = providerChain();

  for (const provider of chain) {
    const started = Date.now();

    let result: ExtractedIdentity | null = null;
    try {
      result = await provider.read({ image, contentType });
    } catch (err) {
      console.error(`[id-extraction] ${provider.id} threw`, err);
    }

    const elapsed = Date.now() - started;

    if (!result) {
      console.info(`[id-extraction] ${provider.id} read nothing (${elapsed}ms)`);
      continue;
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

  return null;
}
