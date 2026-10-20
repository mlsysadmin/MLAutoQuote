import { env } from "@/lib/env";
import { getObject } from "@/lib/storage";
import { hasDraftAccess } from "@/lib/draft-access";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ key: string[] }> };

/**
 * Serves locally-stored photos in development.
 *
 * Access is still checked: either the browser that uploaded it, or signed-in
 * staff. Customers' CR and OR scans are not world-readable even on a laptop.
 */
export async function GET(_req: Request, { params }: Params) {
  if (env.storage.driver !== "local") {
    return new Response("Not found", { status: 404 });
  }

  const { key } = await params;
  const storageKey = key.join("/");

  const match = storageKey.match(/^submissions\/([^/]+)\//);
  if (!match) return new Response("Not found", { status: 404 });

  const allowed =
    (await hasDraftAccess(match[1])) || Boolean(await getSessionUser());
  if (!allowed) return new Response("Forbidden", { status: 403 });

  const object = await getObject(storageKey);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(object.body), {
    headers: {
      "Content-Type": object.contentType,
      "Content-Length": String(object.body.byteLength),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
