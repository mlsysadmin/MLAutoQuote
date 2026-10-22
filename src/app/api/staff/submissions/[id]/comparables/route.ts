import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { comparableInputSchema, fieldErrors } from "@/lib/validation";
import { isMarketplaceUrl, marketplaceListingId } from "@/lib/valuation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Adds a comparable the appraiser found and pasted in. */
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

  const parsed = comparableInputSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "Check the listing details.", fields: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const submission = await prisma.submission.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!submission) {
    return Response.json({ error: "Submission not found." }, { status: 404 });
  }

  const { url } = parsed.data;
  const created = await prisma.comparable.create({
    data: {
      submissionId: id,
      source: isMarketplaceUrl(url) ? "FACEBOOK_MARKETPLACE" : "MANUAL",
      externalId: marketplaceListingId(url),
      title: parsed.data.title,
      url,
      pricePhp: parsed.data.pricePhp,
      year: parsed.data.year ?? null,
      mileageKm: parsed.data.mileageKm ?? null,
      location: parsed.data.location ?? null,
      addedById: auth.id,
    },
  });

  return Response.json(created, { status: 201 });
}

/** Excludes or restores a comparable without losing the row. */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireStaff("APPRAISER");
  if (auth instanceof Response) return auth;

  const { id } = await params;

  let body: { comparableId?: string; isExcluded?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.comparableId || typeof body.isExcluded !== "boolean") {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await prisma.comparable.updateMany({
    where: { id: body.comparableId, submissionId: id },
    data: { isExcluded: body.isExcluded },
  });
  if (result.count === 0) {
    return Response.json({ error: "Listing not found." }, { status: 404 });
  }

  return Response.json({ ok: true });
}

/** Removes an appraiser-added comparable entirely. */
export async function DELETE(req: Request, { params }: Params) {
  const auth = await requireStaff("APPRAISER");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const comparableId = new URL(req.url).searchParams.get("comparableId");
  if (!comparableId) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  await prisma.comparable.deleteMany({
    where: {
      id: comparableId,
      submissionId: id,
      source: { in: ["MANUAL", "FACEBOOK_MARKETPLACE"] },
    },
  });

  return Response.json({ ok: true });
}
