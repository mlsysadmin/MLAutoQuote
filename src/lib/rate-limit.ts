import "server-only";

/**
 * In-memory fixed-window rate limiting.
 *
 * Scoped to one container, which is the right trade-off here: it costs nothing
 * and no round trip, and Cloud Run's own concurrency limits cap the blast
 * radius. The endpoints it guards — staff login, public submission creation —
 * are about slowing down scripted abuse, not metering a paid API.
 */

type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) sweep(now);
    return { ok: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

function sweep(now: number): void {
  for (const [key, window] of buckets) {
    if (window.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Failed sign-ins per account.
 *
 * The per-IP limit alone doesn't protect one account from a spread-out attack,
 * and a per-account counter doesn't protect the server from a flood — so both
 * run. Counting per account also means a locked account stays reachable from
 * its owner's other device once the window passes, rather than banning an IP
 * a whole branch shares.
 */
const failures = new Map<string, { count: number; until: number }>();

const LOCKOUT_THRESHOLD = 8;
const LOCKOUT_MS = 15 * 60 * 1000;

export function accountLocked(email: string): number {
  const key = email.trim().toLowerCase();
  const entry = failures.get(key);
  if (!entry) return 0;

  if (entry.until <= Date.now()) {
    failures.delete(key);
    return 0;
  }
  return entry.count >= LOCKOUT_THRESHOLD
    ? Math.ceil((entry.until - Date.now()) / 1000)
    : 0;
}

export function recordFailure(email: string): void {
  const key = email.trim().toLowerCase();
  const now = Date.now();
  const entry = failures.get(key);

  if (!entry || entry.until <= now) {
    failures.set(key, { count: 1, until: now + LOCKOUT_MS });
  } else {
    entry.count += 1;
    // Each failure extends the window, so a slow drip can't outlast it.
    entry.until = now + LOCKOUT_MS;
  }

  if (failures.size > 10_000) {
    for (const [k, v] of failures) if (v.until <= now) failures.delete(k);
  }
}

export function clearFailures(email: string): void {
  failures.delete(email.trim().toLowerCase());
}

/** Best-effort client IP behind Cloud Run's proxy. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
