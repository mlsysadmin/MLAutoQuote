import { authenticate, writeAudit } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { loginSchema, fieldErrors } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = rateLimit(`login:${ip}`, 10, 10 * 60 * 1000);
  if (!limit.ok) {
    return Response.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "Check your details.", fields: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) {
    // Deliberately vague: never reveal whether the email exists.
    return Response.json(
      { error: "That email and password don't match an active account." },
      { status: 401 },
    );
  }

  await createSession(user);
  await writeAudit({
    actorUserId: user.id,
    action: "staff.login",
    entity: "User",
    entityId: user.id,
    ip,
  });

  return Response.json({ ok: true, name: user.name, role: user.role });
}
