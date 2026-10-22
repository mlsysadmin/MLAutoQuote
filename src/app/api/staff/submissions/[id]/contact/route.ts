import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, writeAudit } from "@/lib/auth";
import { fieldErrors } from "@/lib/validation";
import { clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  customerEmail: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(200)
    .nullable()
    .or(z.literal("").transform(() => null)),
});

/**
 * Corrects the customer's email on a submission.
 *
 * Most customers skip the email, and plenty mistype it. An appraiser on the
 * phone is the one person placed to fix that, and without an address the offer
 * email has nowhere to go.
 *
 * Writes through to the customer record as well, so the correction isn't lost
 * the next time they sell us something.
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

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "Check the address.", fields: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const submission = await prisma.submission.findUnique({
    where: { id },
    select: { id: true, customerId: true, customerEmail: true },
  });
  if (!submission) {
    return Response.json({ error: "Submission not found." }, { status: 404 });
  }

  const customerEmail = parsed.data.customerEmail;

  await prisma.submission.update({ where: { id }, data: { customerEmail } });

  // Keep the registry in step; a failure here must not lose the correction on
  // the submission itself.
  if (submission.customerId) {
    try {
      await prisma.customer.update({
        where: { id: submission.customerId },
        data: { email: customerEmail },
      });
    } catch (err) {
      console.error("customer email sync failed", err);
    }
  }

  await writeAudit({
    actorUserId: auth.id,
    action: "submission.email_updated",
    entity: "Submission",
    entityId: id,
    ip: clientIp(req),
    // The addresses themselves stay out of the audit meta.
    meta: { had: Boolean(submission.customerEmail), now: Boolean(customerEmail) },
  });

  return Response.json({ ok: true, customerEmail });
}
