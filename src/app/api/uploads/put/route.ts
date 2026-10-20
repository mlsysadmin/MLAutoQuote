import { env } from "@/lib/env";
import { putObject, MAX_UPLOAD_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/storage";
import { hasDraftAccess } from "@/lib/draft-access";

export const dynamic = "force-dynamic";

/**
 * Local development upload sink.
 *
 * In production the browser PUTs straight to Cloud Storage and never reaches
 * this route — it exists so the whole flow works with nothing but Node and
 * MySQL on a laptop.
 */
export async function PUT(req: Request) {
  if (env.storage.driver !== "local") {
    return Response.json({ error: "Not available." }, { status: 404 });
  }

  const key = new URL(req.url).searchParams.get("key") ?? "";
  const match = key.match(/^submissions\/([^/]+)\//);
  if (!match) {
    return Response.json({ error: "Invalid key." }, { status: 400 });
  }

  if (!(await hasDraftAccess(match[1]))) {
    return Response.json({ error: "Not allowed." }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!ALLOWED_IMAGE_TYPES.includes(contentType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return Response.json({ error: "Unsupported file type." }, { status: 400 });
  }

  const buffer = Buffer.from(await req.arrayBuffer());
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "That file is too large." }, { status: 413 });
  }

  try {
    await putObject(key, buffer, contentType);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("local upload failed", err);
    return Response.json({ error: "Upload failed." }, { status: 500 });
  }
}
