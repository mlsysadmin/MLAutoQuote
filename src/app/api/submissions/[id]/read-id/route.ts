import { prisma } from "@/lib/prisma";
import { requireDraftAccess } from "@/lib/draft-access";
import { getObject } from "@/lib/storage";
import { readIdPhoto, isIdExtractionEnabled } from "@/lib/id-extraction";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Reads the government ID the customer already uploaded, so the last step of
 * the wizard can be pre-filled instead of typed.
 *
 * What comes back is a suggestion. It is never written to the submission here
 * — the customer sees the fields, corrects them and submits as usual.
 */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;

  const denied = await requireDraftAccess(id);
  if (denied) return denied;

  if (!isIdExtractionEnabled()) {
    // Not an error: the feature is simply off, and the form works without it.
    return Response.json({ available: false, identity: null });
  }

  // Reading an ID costs money per call, so a stuck client can't loop on it.
  const limit = rateLimit(`read-id:${clientIp(req)}`, 12, 10 * 60 * 1000);
  if (!limit.ok) {
    return Response.json(
      { error: "Too many attempts. Type your details in instead." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const photo = await prisma.photo.findFirst({
    where: { submissionId: id, slot: "DOC_ID" },
    orderBy: { createdAt: "desc" },
    select: { storageKey: true, contentType: true },
  });

  if (!photo) {
    return Response.json({ available: true, identity: null, reason: "no-photo" });
  }

  const object = await getObject(photo.storageKey);
  if (!object) {
    return Response.json({ available: true, identity: null, reason: "no-photo" });
  }

  try {
    const identity = await readIdPhoto(object.body, object.contentType);
    return Response.json({ available: true, identity });
  } catch (err) {
    // A failed read is a silent fallback to typing, never a blocked form.
    console.error("id read failed", err);
    return Response.json({ available: true, identity: null, reason: "failed" });
  }
}
