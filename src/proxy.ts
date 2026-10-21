import { NextResponse, type NextRequest } from "next/server";

/**
 * Cross-site request forgery protection.
 *
 * Runs as Next's proxy (what earlier versions called middleware), so it sits
 * in front of every API route without each one having to remember the check.
 *
 * Every authenticated surface here is cookie-based — the staff session and the
 * customer's draft-ownership cookie — which is exactly the shape CSRF attacks
 * exploit: a form on another site POSTs to ours and the browser attaches the
 * cookie automatically. `SameSite=lax` blocks the common cases but is not a
 * complete answer on its own, and it is a property of the cookie rather than a
 * check we control.
 *
 * So state-changing requests must demonstrably come from this origin. Browsers
 * send `Sec-Fetch-Site` on every request and will not let a page forge it;
 * `Origin` is the fallback for anything older. A request with neither is
 * refused rather than trusted.
 *
 * Token-authenticated endpoints are exempt: they carry no cookie, so there is
 * nothing for a third-party page to ride on.
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Authenticated by a bearer token, not a cookie — not forgeable cross-site. */
const TOKEN_AUTHENTICATED = ["/api/ingest/"];

export function proxy(req: NextRequest) {
  if (SAFE_METHODS.has(req.method)) return NextResponse.next();

  const path = req.nextUrl.pathname;
  if (TOKEN_AUTHENTICATED.some((prefix) => path.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Browsers set this themselves and script cannot override it.
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite) {
    // "none" is a direct navigation — typing a URL or a bookmark — which
    // cannot carry a forged POST body from another page.
    if (fetchSite === "same-origin" || fetchSite === "none") {
      return NextResponse.next();
    }
    return refuse(path, `sec-fetch-site: ${fetchSite}`);
  }

  // Older clients: compare the stated origin with where the request arrived.
  const origin = req.headers.get("origin");
  if (!origin) return refuse(path, "no origin and no sec-fetch-site");

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return refuse(path, "unparseable origin");
  }

  if (!host || originHost !== host) {
    return refuse(path, `origin ${originHost} != host ${host}`);
  }

  return NextResponse.next();
}

function refuse(path: string, reason: string) {
  // Logged so a legitimate integration that trips this can be identified,
  // rather than silently failing for someone.
  console.warn(`[csrf] refused ${path}: ${reason}`);
  return NextResponse.json(
    { error: "This request didn't come from the app. Reload and try again." },
    { status: 403 },
  );
}

export const config = {
  // Only the API needs this; pages are GETs and Server Actions carry their own
  // origin check. Static assets are skipped so the check costs nothing there.
  matcher: ["/api/:path*"],
};
