import { prisma } from "@/lib/prisma";
import { hasDraftAccess } from "@/lib/draft-access";
import { getSessionUser } from "@/lib/session";
import { deleteObject } from "@/lib/storage";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ photoId: string }> };

/** Removes a photo — either by the customer who uploaded it, or by staff. */
export async function DELETE(_req: Request, { params }: Params) {
  const { photoId } = await params;

  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: {
      id: true,
      storageKey: true,
      submissionId: true,
      submission: { select: { status: true } },
    },
  });
  if (!photo) return Response.json({ ok: true });

  const isOwner = await hasDraftAccess(photo.submissionId);
  const staff = isOwner ? null : await getSessionUser();

  if (!isOwner && !staff) {
    return Response.json({ error: "Not allowed." }, { status: 403 });
  }
  if (isOwner && photo.submission.status !== "DRAFT") {
    return Response.json(
      { error: "This submission is already with an appraiser." },
      { status: 409 },
    );
  }

  await prisma.photo.delete({ where: { id: photoId } });
  await deleteObject(photo.storageKey);

  return Response.json({ ok: true });
}
