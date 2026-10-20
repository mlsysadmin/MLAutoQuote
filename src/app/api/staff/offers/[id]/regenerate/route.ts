import { prisma } from "@/lib/prisma";
import { requireStaff, writeAudit } from "@/lib/auth";
import { generateOffer } from "@/lib/valuation";
import { clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Re-runs the valuation for a submission — after the appraiser has added
 * comparables or excluded an outlier. Produces a new offer version; the
 * previous one is marked superseded and stays in the history.
 */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireStaff("APPRAISER");
  if (auth instanceof Response) return auth;

  const { id } = await params;

  const existing = await prisma.offer.findUnique({
    where: { id },
    select: { submissionId: true, status: true },
  });
  if (!existing) {
    return Response.json({ error: "Offer not found." }, { status: 404 });
  }
  if (existing.status === "SENT" || existing.status === "ACCEPTED") {
    return Response.json(
      { error: "Can't recalculate an offer that's already with the customer." },
      { status: 409 },
    );
  }

  try {
    const { offer } = await generateOffer(existing.submissionId, {
      actorUserId: auth.id,
    });

    await writeAudit({
      actorUserId: auth.id,
      action: "offer.regenerated",
      entity: "Offer",
      entityId: offer.id,
      ip: clientIp(req),
      meta: { previousOfferId: id },
    });

    return Response.json({ ok: true, offerId: offer.id });
  } catch (err) {
    console.error("regenerate failed", err);
    return Response.json(
      { error: "Couldn't recalculate. Check the comparables and try again." },
      { status: 500 },
    );
  }
}
