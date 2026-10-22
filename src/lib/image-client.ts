/**
 * Browser-side image preparation.
 *
 * A modern phone camera produces 4–8 MB per shot, and a customer uploading ten
 * of those over mobile data is a customer who gives up. Downscaling to 1600px
 * and re-encoding as WebP in the browser typically cuts each file to 150–350 KB
 * — a ten-photo submission goes from ~50 MB to under 3 MB, and it happens while
 * they are still looking at the thumbnail.
 *
 * Anything we cannot decode (HEIC outside Safari, an exotic codec) is uploaded
 * untouched rather than rejected.
 */

export type PreparedImage = {
  blob: Blob;
  contentType: string;
  width: number;
  height: number;
  /** Object URL for an instant local thumbnail. Revoke when done. */
  previewUrl: string;
  originalBytes: number;
};

const MAX_DIMENSION = 1600;
const QUALITY = 0.82;

export type PrepareOptions = {
  /**
   * Turn a portrait photo a quarter turn so it comes out landscape. For slots
   * that are always a landscape card — a government ID — where someone holding
   * the phone upright produces a sideways picture that nobody can read.
   */
  preferLandscape?: boolean;

  /**
   * Quarter turns clockwise the customer has asked for, on top of whatever
   * `preferLandscape` decides. Always re-encoded from the original file rather
   * than from the last rendering, so turning a photo four times gets the
   * original back instead of four generations of WebP.
   */
  quarterTurns?: number;
};

export async function prepareImage(
  file: File,
  options: PrepareOptions = {},
): Promise<PreparedImage> {
  const originalBytes = file.size;

  try {
    const bitmap = await decodeUpright(file);

    const fitted = fitWithin(bitmap.width, bitmap.height, MAX_DIMENSION);

    // The automatic quarter turn for a card slot, plus whatever the customer
    // has asked for since. A quarter or three-quarter turn swaps the output's
    // width and height; a half turn doesn't.
    const auto =
      Boolean(options.preferLandscape) && fitted.height > fitted.width ? 1 : 0;
    const turns = (((auto + (options.quarterTurns ?? 0)) % 4) + 4) % 4;
    const swapped = turns === 1 || turns === 3;
    const width = swapped ? fitted.height : fitted.width;
    const height = swapped ? fitted.width : fitted.height;

    // OffscreenCanvas keeps the work off the main thread where available, so
    // the UI doesn't jank while a batch of photos is processed.
    const canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement("canvas"), { width, height });

    const ctx = canvas.getContext("2d") as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null;
    if (!ctx) throw new Error("no 2d context");

    // Move the origin to the corner the turned image starts from, turn, then
    // draw at the source's own dimensions. For a quarter turn clockwise that
    // corner is the top-right: source (x, y) lands at (width − y, x), filling
    // a canvas of the swapped dimensions.
    if (turns === 1) ctx.translate(width, 0);
    else if (turns === 2) ctx.translate(width, height);
    else if (turns === 3) ctx.translate(0, height);
    if (turns) ctx.rotate((turns * Math.PI) / 2);

    ctx.drawImage(bitmap, 0, 0, fitted.width, fitted.height);
    bitmap.close?.();

    const contentType = (await supportsWebp()) ? "image/webp" : "image/jpeg";
    const blob = await toBlob(canvas, contentType, QUALITY);

    // Re-encoding a small, already-optimised file can make it bigger — unless
    // it has been turned, in which case the original is the wrong picture and
    // a few more kilobytes is the price of it being the right way up.
    if (!turns && blob.size >= originalBytes && isUploadable(file.type)) {
      return rawResult(file, width, height);
    }

    return {
      blob,
      contentType,
      width,
      height,
      previewUrl: URL.createObjectURL(blob),
      originalBytes,
    };
  } catch {
    return rawResult(file, 0, 0);
  }
}

/**
 * Decodes the file the right way up.
 *
 * `imageOrientation: "from-image"` applies the EXIF orientation during decode.
 * Without it the flag is honoured by nobody: the canvas re-encode below strips
 * EXIF entirely, so a photo the phone recorded as "turn this a quarter when you
 * show it" gets saved permanently sideways — which is exactly how an ID ends up
 * unreadable in the appraiser's gallery.
 */
async function decodeUpright(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Older engines reject the options argument outright; a sideways photo
    // beats no photo.
    return createImageBitmap(file);
  }
}

function rawResult(file: File, width: number, height: number): PreparedImage {
  return {
    blob: file,
    contentType: file.type || "image/jpeg",
    width,
    height,
    previewUrl: URL.createObjectURL(file),
    originalBytes: file.size,
  };
}

function isUploadable(type: string): boolean {
  return ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(type);
}

function fitWithin(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  const scale = max / Math.max(w, h);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

async function toBlob(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  if ("convertToBlob" in canvas) {
    return canvas.convertToBlob({ type, quality });
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("encode failed"))),
      type,
      quality,
    );
  });
}

let webpSupport: Promise<boolean> | null = null;
function supportsWebp(): Promise<boolean> {
  webpSupport ??= (async () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL("image/webp").startsWith("data:image/webp");
    } catch {
      return false;
    }
  })();
  return webpSupport;
}

/** Runs tasks with a cap on how many are in flight — kinder to mobile radios. */
export async function withConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit = 3,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (next < tasks.length) {
      const index = next++;
      results[index] = await tasks[index]();
    }
  });

  await Promise.all(workers);
  return results;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
