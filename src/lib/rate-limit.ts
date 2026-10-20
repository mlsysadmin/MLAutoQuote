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

/** Best-effort client IP behind Cloud Run's proxy. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
