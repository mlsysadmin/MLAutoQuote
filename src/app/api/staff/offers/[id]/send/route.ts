import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { requireStaff, writeAudit } from "@/lib/auth";
import { effectiveOfferPhp } from "@/lib/valuation";
import { notifyOfferSent } from "@/lib/notify";
import { clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Releases the offer to the customer.
 *
 * This is the only path by which a number reaches a customer, and it is always
 * an appraiser's deliberate action — the valuation engine can propose, never
 * publish.
 */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireStaff("APPRAISER");
  if (auth instanceof Response) return auth;

  const { id } = await params;

  const offer = await prisma.offer.findUnique({
    where: { id },
    include: {
      submission: {
        select: {
          id: true,
          publicToken: true,
          refCode: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          make: true,
          model: true,
          year: true,
        },
      },
    },
  });
  if (!offer) {
    return Response.json({ error: "Offer not found." }, { status: 404 });
  }
  if (offer.status === "SENT") {
    return Response.json(
      { error: "This offer has already been sent." },
      { status: 409 },
    );
  }

  const finalPhp = effectiveOfferPhp(offer);
  if (finalPhp <= 0) {
    return Response.json(
      { error: "Set an offer amount before sending." },
      { status: 400 },
    );
  }

  const validUntil = new Date(
    Date.now() + env.valuation.offerValidityDays * 24 * 60 * 60 * 1000,
  );

  const [updated] = await prisma.$transaction([
    prisma.offer.update({
      where: { id },
      data: {
        status: "SENT",
        finalOfferPhp: finalPhp,
        appraiserId: auth.id,
        sentAt: new Date(),
        validUntil,
      },
    }),
    prisma.offerEvent.create({
      data: {
        offerId: id,
        type: "SENT_TO_CUSTOMER",
        actorUserId: auth.id,
        payload: { finalOfferPhp: finalPhp },
      },
    }),
    prisma.submission.update({
      where: { id: offer.submissionId },
      data: { status: "OFFER_SENT" },
    }),
  ]);

  const link = `${env.appUrl}/track/${offer.submission.publicToken}`;

  // Delivery failures must not roll back a sent offer — the customer can still
  // reach it from their tracking link, and the queue shows it as sent.
  try {
    await notifyOfferSent({
      submission: offer.submission,
      offerPhp: finalPhp,
      link,
      validUntil,
    });
  } catch (err) {
    console.error("offer notification failed", err);
  }

  await writeAudit({
    actorUserId: auth.id,
    action: "offer.sent",
    entity: "Offer",
    entityId: id,
    ip: clientIp(req),
    meta: { finalOfferPhp: finalPhp, refCode: offer.submission.refCode },
  });

  return Response.json({
    ok: true,
    status: updated.status,
    finalOfferPhp: finalPhp,
    link,
  });
}
