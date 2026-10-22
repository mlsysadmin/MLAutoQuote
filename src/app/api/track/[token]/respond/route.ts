import { prisma } from "@/lib/prisma";
import { customerResponseSchema, fieldErrors } from "@/lib/validation";
import { writeAudit } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

/** The customer accepting or declining their offer. */
export async function POST(req: Request, { params }: Params) {
  const { token } = await params;

  const limit = rateLimit(`respond:${clientIp(req)}`, 30, 10 * 60 * 1000);
  if (!limit.ok) {
    return Response.json({ error: "Please slow down." }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = customerResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request.", fields: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const submission = await prisma.submission.findUnique({
    where: { publicToken: token },
    select: {
      id: true,
      refCode: true,
      status: true,
      offers: {
        where: { status: "SENT" },
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  const offer = submission?.offers[0];
  if (!submission || !offer) {
    return Response.json({ error: "Offer not found." }, { status: 404 });
  }

  if (offer.validUntil && offer.validUntil < new Date()) {
    await prisma.$transaction([
      prisma.offer.update({ where: { id: offer.id }, data: { status: "EXPIRED" } }),
      prisma.submission.update({
        where: { id: submission.id },
        data: { status: "EXPIRED" },
      }),
    ]);
    return Response.json(
      { error: "This offer has expired. Contact us and we'll refresh it." },
      { status: 409 },
    );
  }

  const accepted = parsed.data.action === "ACCEPT";

  await prisma.$transaction([
    prisma.offer.update({
      where: { id: offer.id },
      data: {
        status: accepted ? "ACCEPTED" : "DECLINED",
        respondedAt: new Date(),
        declineReason: accepted ? null : parsed.data.reason,
      },
    }),
    prisma.offerEvent.create({
      data: {
        offerId: offer.id,
        type: accepted ? "ACCEPTED" : "DECLINED",
        payload: parsed.data.reason ? { reason: parsed.data.reason } : undefined,
      },
    }),
    prisma.submission.update({
      where: { id: submission.id },
      data: { status: accepted ? "ACCEPTED" : "DECLINED" },
    }),
  ]);

  await writeAudit({
    action: accepted ? "offer.accepted" : "offer.declined",
    entity: "Offer",
    entityId: offer.id,
    ip: clientIp(req),
    meta: { refCode: submission.refCode },
  });

  return Response.json({ ok: true, status: accepted ? "ACCEPTED" : "DECLINED" });
}
