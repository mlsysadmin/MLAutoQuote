import { prisma } from "@/lib/prisma";
import { requireStaff, writeAudit } from "@/lib/auth";
import { offerAdjustSchema, fieldErrors } from "@/lib/validation";
import { clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Saves the appraiser's adjustment. This never changes the offer's status —
 * the customer sees nothing until `send` is called.
 */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireStaff("APPRAISER");
  if (auth instanceof Response) return auth;

  const { id } = await params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = offerAdjustSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "Check the values.", fields: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const offer = await prisma.offer.findUnique({
    where: { id },
    select: { id: true, status: true, systemOfferPhp: true, appraiserOfferPhp: true },
  });
  if (!offer) {
    return Response.json({ error: "Offer not found." }, { status: 404 });
  }
  if (offer.status === "SENT" || offer.status === "ACCEPTED") {
    return Response.json(
      { error: "This offer has already gone to the customer." },
      { status: 409 },
    );
  }

  const updated = await prisma.offer.update({
    where: { id },
    data: {
      appraiserOfferPhp: parsed.data.appraiserOfferPhp ?? null,
      appraiserNotes: parsed.data.appraiserNotes,
      customerMessage: parsed.data.customerMessage,
      appraiserId: auth.id,
    },
    select: {
      id: true,
      appraiserOfferPhp: true,
      appraiserNotes: true,
      customerMessage: true,
    },
  });

  // Only log a real change in the number — note edits would drown the trail.
  if (parsed.data.appraiserOfferPhp !== offer.appraiserOfferPhp) {
    await prisma.offerEvent.create({
      data: {
        offerId: id,
        type: "ADJUSTED",
        actorUserId: auth.id,
        payload: {
          from: offer.appraiserOfferPhp ?? offer.systemOfferPhp,
          to: parsed.data.appraiserOfferPhp ?? offer.systemOfferPhp,
        },
      },
    });
    await writeAudit({
      actorUserId: auth.id,
      action: "offer.adjusted",
      entity: "Offer",
      entityId: id,
      ip: clientIp(req),
      meta: { to: parsed.data.appraiserOfferPhp },
    });
  }

  return Response.json(updated);
}
