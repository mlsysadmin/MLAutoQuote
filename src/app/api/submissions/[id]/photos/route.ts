import { prisma } from "@/lib/prisma";
import { requireDraftAccess } from "@/lib/draft-access";
import { photoConfirmSchema, fieldErrors } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Records a photo the browser has already uploaded to storage. */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;

  const denied = await requireDraftAccess(id);
  if (denied) return denied;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = photoConfirmSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "That photo couldn't be saved.", fields: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  // The key must sit under this submission's prefix — a client can't claim a
  // file belonging to someone else's submission.
  if (!parsed.data.storageKey.startsWith(`submissions/${id}/`)) {
    return Response.json({ error: "Invalid storage key." }, { status: 400 });
  }

  const submission = await prisma.submission.findUnique({
    where: { id },
    select: { status: true },
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

  const photo = await prisma.photo.create({
    data: {
      submissionId: id,
      slot: parsed.data.slot,
      storageKey: parsed.data.storageKey,
      contentType: parsed.data.contentType,
      bytes: parsed.data.bytes,
      width: parsed.data.width ?? null,
      height: parsed.data.height ?? null,
    },
    select: { id: true, slot: true },
  });

  return Response.json(photo, { status: 201 });
}

/** The photos already attached, so a returning customer sees their progress. */
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;

  const denied = await requireDraftAccess(id);
  if (denied) return denied;

  const photos = await prisma.photo.findMany({
    where: { submissionId: id },
    select: { id: true, slot: true, bytes: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return Response.json({ photos });
}
