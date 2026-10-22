import { prisma } from "@/lib/prisma";
import { requireDraftAccess } from "@/lib/draft-access";
import { photoConfirmSchema, fieldErrors } from "@/lib/validation";
import { slotHoldsOnePhoto } from "@/lib/wizard";
import { deleteObject, getViewUrls } from "@/lib/storage";

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

  // Anything already in this slot, before the new one lands. Read first so a
  // half-finished upload can't take the current photo down with it.
  const superseded = slotHoldsOnePhoto(parsed.data.slot)
    ? await prisma.photo.findMany({
        where: { submissionId: id, slot: parsed.data.slot },
        select: { id: true, storageKey: true },
      })
    : [];

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

  // One photo per slot is a rule about the submission, so it is kept here
  // rather than in the form. The form only knows about uploads made in the
  // tab it is running in — come back tomorrow, or open the link on a second
  // phone, and it would happily add a fourth photo of the same wing.
  if (superseded.length > 0) {
    await prisma.photo.deleteMany({
      where: { id: { in: superseded.map((p) => p.id) } },
    });
    // Storage last: an orphaned object costs pennies, a dangling row costs
    // the appraiser a broken image.
    await Promise.all(
      superseded.map((p) =>
        deleteObject(p.storageKey).catch((err) =>
          console.error("superseded photo not removed from storage", err),
        ),
      ),
    );
  }

  return Response.json(photo, { status: 201 });
}

/** The photos already attached, so a returning customer sees their progress. */
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;

  const denied = await requireDraftAccess(id);
  if (denied) return denied;

  const photos = await prisma.photo.findMany({
    where: { submissionId: id },
    select: { id: true, slot: true, bytes: true, storageKey: true },
    orderBy: { createdAt: "asc" },
  });

  // With the URLs, so a customer coming back sees the photos they already
  // took instead of an empty grid. That empty grid is why submissions were
  // arriving with the same wing photographed three times.
  const urls = await getViewUrls(photos.map((p) => p.storageKey));

  return Response.json({
    photos: photos.map((p) => ({
      id: p.id,
      slot: p.slot,
      bytes: p.bytes,
      url: urls[p.storageKey] ?? null,
    })),
  });
}
