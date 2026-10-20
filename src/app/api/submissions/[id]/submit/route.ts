import { prisma } from "@/lib/prisma";
import { requireDraftAccess } from "@/lib/draft-access";
import { missingForSubmit } from "@/lib/submission-mapper";
import { generateOffer } from "@/lib/valuation";
import { upsertCustomerFromIntake } from "@/lib/kyc";
import { writeAudit } from "@/lib/auth";
import { clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Finalises a submission and prepares the initial offer.
 *
 * The offer is created as PENDING_REVIEW — it goes to an appraiser, never
 * straight to the customer. If valuation fails for any reason the submission
 * still lands in the queue; an appraiser can price it by hand rather than the
 * customer losing their work.
 */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;

  const denied = await requireDraftAccess(id);
  if (denied) return denied;

  const submission = await prisma.submission.findUnique({ where: { id } });
  if (!submission) {
    return Response.json({ error: "Submission not found." }, { status: 404 });
  }

  // Already submitted — return the tracking link rather than an error, so a
  // double-tap on a slow connection doesn't look like a failure.
  if (submission.status !== "DRAFT") {
    return Response.json({
      publicToken: submission.publicToken,
      refCode: submission.refCode,
      alreadySubmitted: true,
    });
  }

  const missing = missingForSubmit(submission);
  if (Object.keys(missing).length > 0) {
    return Response.json(
      { error: "A few answers are still needed.", fields: missing },
      { status: 400 },
    );
  }

  // Put the seller on the customer registry, or find the record they already
  // have. Keyed on the mobile number, so a repeat seller's vehicles all hang
  // off one person rather than looking like three strangers.
  let customerId: string | null = null;
  try {
    const customer = await upsertCustomerFromIntake({
      customerName: submission.customerName!,
      customerPhone: submission.customerPhone!,
      customerEmail: submission.customerEmail,
      addressLine: submission.addressLine,
      barangay: submission.barangay,
      city: submission.city,
      province: submission.province,
      birthDate: submission.birthDate,
      idType: submission.idType,
      idNumber: submission.idNumber,
    });
    customerId = customer?.id ?? null;
  } catch (err) {
    // A registry failure must not cost the customer their submission; the
    // record can be reconciled from the snapshot on the submission itself.
    console.error("customer registry upsert failed", err);
  }

  await prisma.submission.update({
    where: { id },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      lastStep: 7,
      ...(customerId ? { customerId } : {}),
    },
  });

  try {
    await generateOffer(id);
  } catch (err) {
    // The queue is the source of truth; a missing valuation is an appraiser's
    // problem to solve, not a reason to reject the customer's submission.
    console.error("initial valuation failed", err);
    await prisma.submission.update({
      where: { id },
      data: { status: "IN_REVIEW" },
    });
  }

  await writeAudit({
    action: "submission.submitted",
    entity: "Submission",
    entityId: id,
    ip: clientIp(req),
    meta: { refCode: submission.refCode },
  });

  return Response.json({
    publicToken: submission.publicToken,
    refCode: submission.refCode,
  });
}
