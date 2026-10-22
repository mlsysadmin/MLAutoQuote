import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDraftAccess } from "@/lib/draft-access";
import { toSubmissionData } from "@/lib/submission-mapper";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Autosave. Only the browser that created the draft can write to it. */
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;

  const denied = await requireDraftAccess(id);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const existing = await prisma.submission.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!existing) {
    return Response.json({ error: "Submission not found." }, { status: 404 });
  }
  // Once it's with an appraiser, the customer's copy is frozen.
  if (existing.status !== "DRAFT") {
    return Response.json(
      { error: "This submission has already been sent for appraisal." },
      { status: 409 },
    );
  }

  const data = toSubmissionData(body);
  if (Object.keys(data).length === 0) {
    return Response.json({ ok: true });
  }

  try {
    await prisma.submission.update({
      where: { id },
      data: data as Prisma.SubmissionUpdateInput,
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("draft save failed", err);
    return Response.json({ error: "Couldn't save." }, { status: 500 });
  }
}
