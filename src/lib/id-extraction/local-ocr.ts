import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  ExtractedIdentity,
  IdExtractionInput,
  IdExtractionProvider,
} from "./types";
import { parsePhilippineId } from "./parse-ph-id";

/**
 * Tesseract OCR running inside this process, then our own Philippine-ID parser
 * over the text.
 *
 * This is the reader that needs nothing: no API key, no billing account, no
 * outbound call with somebody's ID attached. That makes it the right default —
 * a branch deployment reads IDs on day one instead of waiting on a credential,
 * and the photograph never leaves the container.
 *
 * It is also the weakest of the three. Tesseract is good on a flat, well-lit
 * card and poor on a glared, angled phone snap, which is most of them. So it
 * sits last in the fallback order: wherever Vision or the vision model has
 * credentials, that reads instead. What this guarantees is a floor, not a
 * ceiling — and since every field it fills is shown to the customer for
 * checking, a weak read costs a correction, never a wrong record.
 *
 * `ID_EXTRACTION_PROVIDER=off` turns reading off altogether.
 */
export class LocalOcrProvider implements IdExtractionProvider {
  readonly id = "local";
  readonly label = "On-device OCR (Tesseract)";

  /** Nothing to configure, so it is always available. */
  isEnabled(): boolean {
    return true;
  }

  async read(input: IdExtractionInput): Promise<ExtractedIdentity | null> {
    try {
      const text = await recognise(input.image);
      if (!text || text.trim().length < 12) return null;

      const parsed = parsePhilippineId(text);
      if (parsed.filled.length === 0) return null;

      // Tesseract's own confidence is about character shapes, not about
      // whether it found a name. We take the parser's view and discount it,
      // because this engine misreads more than the hosted ones do and the
      // customer should be nudged to check rather than to trust.
      return {
        ...parsed,
        confidence: Math.min(parsed.confidence, 0.6),
        provider: this.id,
        raw: text,
      };
    } catch (err) {
      console.error("local ocr failed", err);
      return null;
    }
  }
}

/**
 * One worker, kept alive between requests.
 *
 * Starting a Tesseract worker costs a few seconds and loading the English model
 * costs a few more, which is most of a customer's patience spent before the
 * first character is read. The worker is cheap to hold open and the next
 * customer gets a read in under a second.
 */
let workerPromise: Promise<TesseractWorker> | null = null;

type TesseractWorker = {
  recognize: (image: Buffer) => Promise<{ data: { text: string } }>;
  terminate: () => Promise<unknown>;
};

async function getWorker(): Promise<TesseractWorker> {
  workerPromise ??= (async () => {
    const { createWorker } = await import("tesseract.js");
    return (await createWorker("eng", undefined, {
      // Somewhere writable for the language model, so a container that does
      // cache it to disk puts it where it is allowed to.
      cachePath: join(tmpdir(), "mlaq-tesseract"),
      // Tesseract's own progress chatter is not ours to log.
      logger: () => {},
    })) as unknown as TesseractWorker;
  })();

  try {
    return await workerPromise;
  } catch (err) {
    // A failed start must not poison every later request.
    workerPromise = null;
    throw err;
  }
}

/** Reads an image, giving up rather than holding a customer on a slow page. */
async function recognise(image: Buffer): Promise<string | null> {
  const worker = await getWorker();

  const result = await Promise.race([
    worker.recognize(image),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 25_000)),
  ]);

  return result ? result.data.text : null;
}
