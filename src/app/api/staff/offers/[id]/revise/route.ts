import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { requireStaff, writeAudit } from "@/lib/auth";
import { notifyOfferSent } from "@/lib/notify";
import { clientIp } from "@/lib/rate-limit";
import { fieldErrors } from "@/lib/validation";
import {
  requiresJustification,
  MIN_OVERRIDE_NOTE_LENGTH,
  OVERRIDE_REASON_VALUES,
} from "@/lib/offer-reasons";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  amountPhp: z.number().int().min(1_000).max(50_000_000),
  overrideReason: z
    .enum(OVERRIDE_REASON_VALUES)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  appraiserNotes: z.string().trim().max(4000),
  customerMessage: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
});

/**
 * Changes an offer the customer has already been shown.
 *
 * A quote goes out, then the appraiser learns something — the seller sends a
 * photo of a receipt for a new transmission, or the branch spots rust the
 * photos hid. Making them start a new submission is absurd, and quietly
 * editing the sent offer would destroy the one record of what the customer
 * was actually promised.
 *
 * So a revision is a new version. The old one is marked SUPERSEDED and kept
 * exactly as it was sent, and both stay on the submission as a history an
 * auditor can read months later.
 *
 * Every revision requires a note. Raising an offer costs the company money
 * and lowering one costs a customer something they had already been told they
 * would get; neither should happen without a sentence explaining it.
 */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireStaff("APPRAISER");
  if (auth instanceof Response) return auth;

  const { id } = await params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "That revision can't be saved.", fields: fieldErrors(parsed.error) },
      { status: 400 },
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
      {
        error:
          offer.status === "ACCEPTED"
            ? "The customer has accepted this offer. Changing it now is a conversation, not an edit."
            : "Only an offer that is out with the customer can be revised.",
      },
      { status: 409 },
    );
  }

  const previousPhp = offer.finalOfferPhp ?? offer.appraiserOfferPhp ?? offer.systemOfferPhp;
  const amountPhp = parsed.data.amountPhp;

  if (amountPhp === previousPhp) {
    return Response.json(
      { error: "That's the same amount the customer already has." },
      { status: 400 },
    );
  }

  const notes = parsed.data.appraiserNotes.trim();
  if (notes.length < MIN_OVERRIDE_NOTE_LENGTH) {
    return Response.json(
      {
        error:
          "Say why the offer is changing — at least a sentence. This is kept with both versions.",
        field: "appraiserNotes",
      },
      { status: 400 },
    );
  }

  // The same rule as a first send: above the system's recommendation needs a
  // reason from the list, not just prose.
  if (requiresJustification(amountPhp, offer.systemOfferPhp) && !parsed.data.overrideReason) {
    return Response.json(
      {
        error:
          "This is above the system's recommendation. Choose a reason before revising.",
        field: "overrideReason",
      },
      { status: 400 },
    );
  }

  // A revision is a new offer, so the clock starts again. A customer should
  // not get two days to think about a number they were only just given.
  const validUntil = new Date(
    Date.now() + env.valuation.offerValidityDays * 24 * 60 * 60 * 1000,
  );

  const [, revised] = await prisma.$transaction([
    prisma.offer.update({
      where: { id },
      data: { status: "SUPERSEDED" },
    }),
    prisma.offer.create({
      data: {
        submissionId: offer.submissionId,
        version: offer.version + 1,
        status: "SENT",

        // The market snapshot is carried over untouched. This is a change of
        // mind about the same car on the same evidence — re-running the
        // valuation would move the number for reasons nobody asked about.
        compLowPhp: offer.compLowPhp,
        compMidPhp: offer.compMidPhp,
        compHighPhp: offer.compHighPhp,
        compCount: offer.compCount,
        compLowId: offer.compLowId,
        compMidId: offer.compMidId,
        compHighId: offer.compHighId,
        systemOfferPhp: offer.systemOfferPhp,
        breakdown: offer.breakdown ?? {},

        appraiserOfferPhp: amountPhp,
        finalOfferPhp: amountPhp,
        appraiserNotes: notes,
        overrideReason: parsed.data.overrideReason ?? null,
        customerMessage: parsed.data.customerMessage ?? null,

        appraiserId: auth.id,
        sentAt: new Date(),
        validUntil,
      },
    }),
  ]);

  await prisma.offerEvent.createMany({
    data: [
      {
        offerId: revised.id,
        type: "ADJUSTED",
        actorUserId: auth.id,
        payload: {
          fromPhp: previousPhp,
          toPhp: amountPhp,
          fromVersion: offer.version,
          reason: parsed.data.overrideReason ?? null,
          note: notes,
        },
      },
      {
        offerId: revised.id,
        type: "SENT_TO_CUSTOMER",
        actorUserId: auth.id,
        payload: { finalOfferPhp: amountPhp, revision: true },
      },
    ],
  });

  const link = `${env.appUrl}/track/${offer.submission.publicToken}`;

  // A failed message must not roll back the revision — the customer's link
  // already shows the new number, and the staff page says it was sent.
  try {
    await notifyOfferSent({
      submission: offer.submission,
      offerPhp: amountPhp,
      link,
      validUntil,
    });
  } catch (err) {
    console.error("revised offer notification failed", err);
  }

  await writeAudit({
    actorUserId: auth.id,
    action: "offer.revised",
    entity: "Offer",
    entityId: revised.id,
    ip: clientIp(req),
    meta: {
      refCode: offer.submission.refCode,
      supersededOfferId: offer.id,
      fromPhp: previousPhp,
      toPhp: amountPhp,
      direction: amountPhp > previousPhp ? "up" : "down",
    },
  });

  return Response.json({
    ok: true,
    offerId: revised.id,
    version: revised.version,
    finalOfferPhp: amountPhp,
    previousPhp,
  });
}
