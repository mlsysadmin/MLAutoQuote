import { prisma } from "@/lib/prisma";
import { requireDraftAccess } from "@/lib/draft-access";
import { ALLOWED_IMAGE_TYPES, createUploadTarget } from "@/lib/storage";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const SLOTS = new Set([
  "FRONT_34",
  "REAR_34",
  "LEFT_SIDE",
  "RIGHT_SIDE",
  "INTERIOR_FRONT",
  "INTERIOR_REAR",
  "DASH_ODOMETER",
  "ENGINE_BAY",
  "TIRES",
  "DAMAGE",
  "DOC_CR",
  "DOC_OR",
  "DOC_ID",
  "OTHER",
]);

/**
 * Hands the browser a short-lived URL it can PUT the photo straight to.
 *
 * The file never touches this server, which is what keeps a ten-photo upload
 * fast and keeps Cloud Run instances from being tied up moving bytes.
 */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;

  const denied = await requireDraftAccess(id);
  if (denied) return denied;

  let body: { slot?: string; contentType?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const slot = body.slot ?? "";
  const contentType = body.contentType ?? "";

  if (!SLOTS.has(slot)) {
    return Response.json({ error: "Unknown photo slot." }, { status: 400 });
  }
  if (!ALLOWED_IMAGE_TYPES.includes(contentType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return Response.json(
      { error: "That file type isn't supported. Use a photo from your camera." },
      { status: 400 },
    );
  }

  const submission = await prisma.submission.findUnique({
    where: { id },
    select: { status: true, _count: { select: { photos: true } } },
  });
  if (!submission) {
    return Response.json({ error: "Submission not found." }, { status: 404 });
  }
  if (submission.status !== "DRAFT") {
    return Response.json(
      { error: "This submission is already with an appraiser." },
      { status: 409 },
    );
  }
  if (submission._count.photos >= 40) {
    return Response.json(
      { error: "That's the maximum number of photos for one submission." },
      { status: 409 },
    );
  }

  try {
    const target = await createUploadTarget({
      submissionId: id,
      slot,
      contentType,
    });
    return Response.json(target);
  } catch (err) {
    console.error("sign upload failed", err);
    return Response.json(
      { error: "Couldn't prepare the upload. Please try again." },
      { status: 500 },
    );
  }
}
