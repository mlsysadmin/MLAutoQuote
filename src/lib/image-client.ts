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

export async function prepareImage(file: File): Promise<PreparedImage> {
  const originalBytes = file.size;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(
      bitmap.width,
      bitmap.height,
      MAX_DIMENSION,
    );

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

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const contentType = (await supportsWebp()) ? "image/webp" : "image/jpeg";
    const blob = await toBlob(canvas, contentType, QUALITY);

    // Re-encoding a small, already-optimised file can make it bigger.
    if (blob.size >= originalBytes && isUploadable(file.type)) {
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
