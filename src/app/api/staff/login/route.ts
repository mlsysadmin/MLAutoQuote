import { authenticate, writeAudit } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { loginSchema, fieldErrors } from "@/lib/validation";
import {
  clientIp,
  rateLimit,
  accountLocked,
  recordFailure,
  clearFailures,
} from "@/lib/rate-limit";

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

  // A per-IP limit doesn't stop a spread-out attack on one account, so the
  // account is counted separately. Checked before the password is verified, so
  // a locked account costs an attacker nothing to learn and gains them nothing.
  const lockedFor = accountLocked(parsed.data.email);
  if (lockedFor > 0) {
    await writeAudit({
      action: "staff.login_locked",
      entity: "User",
      entityId: parsed.data.email.trim().toLowerCase(),
      ip,
    });
    return Response.json(
      {
        error:
          "Too many failed attempts for this account. Try again in a few minutes.",
      },
      { status: 429, headers: { "Retry-After": String(lockedFor) } },
    );
  }

  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) {
    recordFailure(parsed.data.email);
    await writeAudit({
      action: "staff.login_failed",
      entity: "User",
      entityId: parsed.data.email.trim().toLowerCase(),
      ip,
    });

    // Deliberately vague: never reveal whether the email exists.
    return Response.json(
      { error: "That email and password don't match an active account." },
      { status: 401 },
    );
  }

  clearFailures(parsed.data.email);
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
