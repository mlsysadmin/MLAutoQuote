import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { makePublicToken, makeRefCode } from "@/lib/ids";
import { grantDraftAccess } from "@/lib/draft-access";
import { toSubmissionData } from "@/lib/submission-mapper";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Creates the draft row once a customer has entered something worth keeping. */
export async function POST(req: Request) {
  const limit = rateLimit(`create:${clientIp(req)}`, 20, 60 * 60 * 1000);
  if (!limit.ok) {
    return Response.json(
      { error: "Too many submissions from this connection. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    // An empty draft is perfectly valid.
  }

  const data = toSubmissionData(body);

  // refCode is short enough to collide eventually; retry rather than fail.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const submission = await prisma.submission.create({
        data: {
          ...data,
          refCode: makeRefCode(),
          publicToken: makePublicToken(),
          status: "DRAFT",
        } as Prisma.SubmissionCreateInput,
        select: { id: true, refCode: true },
      });

      await grantDraftAccess(submission.id);
      return Response.json(submission, { status: 201 });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "P2002" && attempt < 4) continue;
      console.error("submission create failed", err);
      return Response.json(
        { error: "We couldn't start your submission. Please try again." },
        { status: 500 },
      );
    }
  }

  return Response.json({ error: "Please try again." }, { status: 500 });
}
