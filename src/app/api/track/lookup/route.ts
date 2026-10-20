import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Recovering a lost tracking link.
 *
 * Requires both the reference code and the mobile number on the submission —
 * neither alone is enough, and the response is identical whether or not a
 * match exists, so this can't be used to confirm that someone sold a car.
 */
export async function POST(req: Request) {
  const limit = rateLimit(`lookup:${clientIp(req)}`, 12, 15 * 60 * 1000);
  if (!limit.ok) {
    return Response.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  let body: { refCode?: string; phone?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const refCode = (body.refCode ?? "").trim().toUpperCase();
  const phone = normalisePhone(body.phone ?? "");

  const notFound = Response.json(
    {
      error:
        "We couldn't find that. Check the reference code and the number you used.",
    },
    { status: 404 },
  );

  if (!refCode || !phone) return notFound;

  const submission = await prisma.submission.findUnique({
    where: { refCode },
    select: { publicToken: true, customerPhone: true },
  });

  if (!submission || normalisePhone(submission.customerPhone ?? "") !== phone) {
    return notFound;
  }

  return Response.json({ publicToken: submission.publicToken });
}

/** 0917…, +63917…, 63917… all become 639171234567. */
function normalisePhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.startsWith("63")) return digits;
  if (digits.startsWith("0")) return `63${digits.slice(1)}`;
  if (digits.startsWith("9")) return `63${digits}`;
  return digits;
}
