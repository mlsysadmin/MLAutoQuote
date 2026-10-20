import "server-only";

import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import type { Storage } from "@google-cloud/storage";
import { env } from "./env";
import { makeStorageId } from "./ids";

/**
 * Photo storage.
 *
 * In production the browser uploads straight to Cloud Storage with a V4 signed
 * PUT URL, so a 4 MB phone photo never passes through Cloud Run — that is the
 * single biggest win for upload speed on a mobile connection.
 *
 * In development `STORAGE_DRIVER=local` writes under ./.uploads instead, so the
 * whole flow runs with nothing but Node and MySQL.
 */

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
] as const;

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // 12 MB before client-side compression

const LOCAL_ROOT = path.join(process.cwd(), ".uploads");
const VIEW_URL_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export type UploadTarget = {
  /** Where the browser sends the file. */
  url: string;
  method: "PUT" | "POST";
  headers: Record<string, string>;
  /** The key to persist on the Photo row. */
  storageKey: string;
};

// ── Lazily-created GCS client ────────────────────────────────────────────────

let storageClient: Storage | null = null;
async function gcs(): Promise<Storage> {
  if (!storageClient) {
    const { Storage: GCS } = await import("@google-cloud/storage");
    storageClient = new GCS();
  }
  return storageClient;
}

function extensionFor(contentType: string): string {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    case "image/heic":
      return "heic";
    default:
      return "jpg";
  }
}

export function buildStorageKey(
  submissionId: string,
  slot: string,
  contentType: string,
): string {
  return `submissions/${submissionId}/${slot.toLowerCase()}-${makeStorageId()}.${extensionFor(contentType)}`;
}

// ── Uploads ──────────────────────────────────────────────────────────────────

export async function createUploadTarget(input: {
  submissionId: string;
  slot: string;
  contentType: string;
}): Promise<UploadTarget> {
  const storageKey = buildStorageKey(
    input.submissionId,
    input.slot,
    input.contentType,
  );

  if (env.storage.driver === "local") {
    return {
      url: `/api/uploads/put?key=${encodeURIComponent(storageKey)}`,
      method: "PUT",
      headers: { "Content-Type": input.contentType },
      storageKey,
    };
  }

  // On Cloud Run the attached service account signs this through IAM, which is
  // why it needs roles/iam.serviceAccountTokenCreator.
  const client = await gcs();
  const [url] = await client
    .bucket(env.storage.bucket)
    .file(storageKey)
    .getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000,
      contentType: input.contentType,
    });

  return {
    url,
    method: "PUT",
    headers: { "Content-Type": input.contentType },
    storageKey,
  };
}

/** Server-side write, used by the local driver and the seed script. */
export async function putObject(
  storageKey: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  if (env.storage.driver === "local") {
    const full = safeLocalPath(storageKey);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
    return;
  }

  const client = await gcs();
  await client
    .bucket(env.storage.bucket)
    .file(storageKey)
    .save(body, { contentType, resumable: false });
}

export async function getObject(
  storageKey: string,
): Promise<{ body: Buffer; contentType: string } | null> {
  try {
    if (env.storage.driver === "local") {
      const body = await readFile(safeLocalPath(storageKey));
      return { body, contentType: guessContentType(storageKey) };
    }
    const client = await gcs();
    const file = client.bucket(env.storage.bucket).file(storageKey);
    const [body] = await file.download();
    const [meta] = await file.getMetadata();
    return {
      body,
      contentType: meta.contentType ?? guessContentType(storageKey),
    };
  } catch {
    return null;
  }
}

export async function deleteObject(storageKey: string): Promise<void> {
  try {
    if (env.storage.driver === "local") {
      await unlink(safeLocalPath(storageKey));
      return;
    }
    const client = await gcs();
    await client.bucket(env.storage.bucket).file(storageKey).delete();
  } catch {
    // A missing object is the state we wanted anyway.
  }
  viewUrlCache.delete(storageKey);
}

// ── Read URLs ────────────────────────────────────────────────────────────────

/**
 * Signing on Cloud Run goes through IAM signBlob, a network round trip. The
 * same photo is viewed many times (queue thumbnail, detail page, customer
 * offer), so signatures are cached in-process until shortly before they lapse.
 */
const viewUrlCache = new Map<string, { url: string; expiresAt: number }>();

export async function getViewUrl(storageKey: string): Promise<string> {
  if (env.storage.driver === "local") {
    return `/api/uploads/${storageKey}`;
  }

  const cached = viewUrlCache.get(storageKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.url;

  const client = await gcs();
  const [url] = await client
    .bucket(env.storage.bucket)
    .file(storageKey)
    .getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + VIEW_URL_TTL_MS,
    });

  if (viewUrlCache.size > 2000) viewUrlCache.clear();
  viewUrlCache.set(storageKey, {
    url,
    expiresAt: Date.now() + VIEW_URL_TTL_MS,
  });
  return url;
}

/** Signs a batch in parallel — a 12-photo gallery costs one round trip, not 12. */
export async function getViewUrls(
  storageKeys: string[],
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    storageKeys.map(async (k) => [k, await getViewUrl(k)] as const),
  );
  return Object.fromEntries(entries);
}

// ── Local driver helpers ─────────────────────────────────────────────────────

/** Blocks `../` escapes from a storage key that reached us over the wire. */
export function safeLocalPath(storageKey: string): string {
  const full = path.resolve(LOCAL_ROOT, storageKey);
  if (!full.startsWith(path.resolve(LOCAL_ROOT) + path.sep)) {
    throw new Error("Invalid storage key.");
  }
  return full;
}

function guessContentType(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "avif":
      return "image/avif";
    case "heic":
      return "image/heic";
    default:
      return "image/jpeg";
  }
}
