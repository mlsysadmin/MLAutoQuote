import { prisma } from "@/lib/prisma";
import { requireStaff, writeAudit } from "@/lib/auth";
import { generateOffer } from "@/lib/valuation";
import { clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Builds the first offer for a submission that doesn't have one.
 *
 * Normally the offer is created the moment the customer submits, but a
 * submission can arrive without one — the valuation failed, or an appraiser
 * imported the unit by hand. This is how they get a valuation attached without
 * the customer having to resubmit.
 */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireStaff("APPRAISER");
  if (auth instanceof Response) return auth;

  const { id } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!submission) {
    return Response.json({ error: "Submission not found." }, { status: 404 });
  }
  if (submission.status === "DRAFT") {
    return Response.json(
      { error: "The customer hasn't submitted this yet." },
      { status: 409 },
    );
  }

  try {
    const { offer } = await generateOffer(id, { actorUserId: auth.id });

    await writeAudit({
      actorUserId: auth.id,
      action: "offer.generated",
      entity: "Offer",
      entityId: offer.id,
      ip: clientIp(req),
      meta: { submissionId: id },
    });

    return Response.json({ ok: true, offerId: offer.id });
  } catch (err) {
    console.error("offer generation failed", err);
    return Response.json(
      { error: "Couldn't build an offer. Check the comparables and try again." },
      { status: 500 },
    );
  }
}
