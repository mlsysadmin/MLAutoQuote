import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { requireStaff, writeAudit } from "@/lib/auth";
import { effectiveOfferPhp } from "@/lib/valuation";
import { notifyOfferSent } from "@/lib/notify";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Sends the same offer to the customer again.
 *
 * A text that never arrived, a mistyped email the appraiser has since
 * corrected, a customer who deleted the message — none of those should need a
 * new valuation, and re-running one would be worse than useless: the market
 * moves, so a fresh quote could come back lower and the customer would see
 * the number drop for no reason they can understand.
 *
 * So this re-delivers what was already agreed. The amount, the validity date
 * and the version are untouched; only the delivery is repeated.
 */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireStaff("APPRAISER");
  if (auth instanceof Response) return auth;

  const { id } = await params;

  // A resend costs the customer a message each time. Enough for a genuine
  // retry, not enough to be used as a nudge.
  const limit = rateLimit(`resend:${id}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return Response.json(
      {
        error:
          "This offer has been resent several times in the last hour. Give it a moment, or call the customer.",
      },
      { status: 429 },
    );
  }

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

  if (offer.status !== "SENT") {
    return Response.json(
      { error: "This offer hasn't been sent yet. Send it first." },
      { status: 409 },
    );
  }

  if (!offer.submission.customerPhone && !offer.submission.customerEmail) {
    return Response.json(
      { error: "No phone number or email on this submission to send to." },
      { status: 400 },
    );
  }

  const finalPhp = effectiveOfferPhp(offer);
  const link = `${env.appUrl}/track/${offer.submission.publicToken}`;

  // The original expiry, not a new one. Resending is not an extension: a
  // customer who has been sitting on an offer for six days should not quietly
  // get another week because the appraiser re-sent the message.
  const validUntil =
    offer.validUntil ??
    new Date(Date.now() + env.valuation.offerValidityDays * 24 * 60 * 60 * 1000);

  try {
    await notifyOfferSent({
      submission: offer.submission,
      offerPhp: finalPhp,
      link,
      validUntil,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("offer resend failed", detail);
    return Response.json(
      { error: `The message didn't go out: ${detail}` },
      { status: 502 },
    );
  }

  await prisma.offerEvent.create({
    data: {
      offerId: id,
      type: "SENT_TO_CUSTOMER",
      actorUserId: auth.id,
      payload: { resend: true, finalOfferPhp: finalPhp },
    },
  });

  await writeAudit({
    actorUserId: auth.id,
    action: "offer.resent",
    entity: "Offer",
    entityId: id,
    ip: clientIp(req),
    meta: { refCode: offer.submission.refCode, finalOfferPhp: finalPhp },
  });

  return Response.json({ ok: true, link, sentTo: recipients(offer.submission) });
}

function recipients(submission: {
  customerPhone: string | null;
  customerEmail: string | null;
}): string[] {
  const out: string[] = [];
  if (submission.customerPhone) out.push("SMS");
  if (submission.customerEmail) out.push("email");
  return out;
}
