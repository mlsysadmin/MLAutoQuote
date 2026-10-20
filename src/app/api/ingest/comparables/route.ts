import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { comparableInputSchema } from "@/lib/validation";
import { isMarketplaceUrl, marketplaceListingId } from "@/lib/valuation";

export const dynamic = "force-dynamic";

/**
 * Collector endpoint.
 *
 * Whatever your team uses to gather live marketplace prices — an internal tool,
 * an approved data partner, a researcher working through listings by hand —
 * posts them here and they become first-class comparables on the submission,
 * ranked and outlier-trimmed alongside everything else.
 *
 * POST /api/ingest/comparables
 *   Authorization: Bearer <COMPARABLES_INGEST_TOKEN>
 *   { "refCode": "MLA-7K3QD2", "listings": [ { url, title, pricePhp, ... } ] }
 *
 * Disabled unless COMPARABLES_INGEST_TOKEN is set.
 */
export async function POST(req: Request) {
  const expected = env.comparables.ingestToken;
  if (!expected) {
    return Response.json({ error: "Ingest is not enabled." }, { status: 404 });
  }

  const presented = (req.headers.get("authorization") ?? "").replace(
    /^Bearer\s+/i,
    "",
  );
  if (!safeEqual(presented, expected)) {
    return Response.json({ error: "Not authorised." }, { status: 401 });
  }

  let body: { refCode?: string; submissionId?: string; listings?: unknown[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const submission = body.submissionId
    ? await prisma.submission.findUnique({
        where: { id: body.submissionId },
        select: { id: true },
      })
    : body.refCode
      ? await prisma.submission.findUnique({
          where: { refCode: body.refCode },
          select: { id: true },
        })
      : null;

  if (!submission) {
    return Response.json({ error: "Submission not found." }, { status: 404 });
  }

  const listings = Array.isArray(body.listings) ? body.listings.slice(0, 50) : [];
  const accepted: string[] = [];
  const rejected: Array<{ index: number; reason: string }> = [];

  for (const [index, raw] of listings.entries()) {
    const parsed = comparableInputSchema.safeParse(raw);
    if (!parsed.success) {
      rejected.push({ index, reason: parsed.error.issues[0]?.message ?? "invalid" });
      continue;
    }

    const { url } = parsed.data;
    const externalId = marketplaceListingId(url);

    // Re-posting the same listing updates it rather than duplicating it.
    const existing = await prisma.comparable.findFirst({
      where: { submissionId: submission.id, url },
      select: { id: true },
    });

    const data = {
      source: isMarketplaceUrl(url)
        ? ("FACEBOOK_MARKETPLACE" as const)
        : ("MANUAL" as const),
      externalId,
      title: parsed.data.title,
      url,
      pricePhp: parsed.data.pricePhp,
      year: parsed.data.year ?? null,
      mileageKm: parsed.data.mileageKm ?? null,
      location: parsed.data.location ?? null,
    };

    const saved = existing
      ? await prisma.comparable.update({ where: { id: existing.id }, data })
      : await prisma.comparable.create({
          data: { ...data, submissionId: submission.id },
        });

    accepted.push(saved.id);
  }

  return Response.json({
    submissionId: submission.id,
    accepted: accepted.length,
    rejected,
  });
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
