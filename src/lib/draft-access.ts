import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

/**
 * Proof that this browser started a given draft.
 *
 * A submission id alone must not be enough to edit someone's draft or attach
 * photos to it. When a draft is created we hand the browser a signed, httpOnly
 * cookie listing the ids it owns, and every mutating draft endpoint checks it.
 * Nothing here is personal data, so the cookie is strictly necessary and needs
 * no consent banner.
 */

const COOKIE_NAME = "mlaq_drafts";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // a month to come back and finish
const MAX_IDS = 20;

let cachedKey: Uint8Array | null = null;
function key(): Uint8Array {
  cachedKey ??= new TextEncoder().encode(env.sessionSecret);
  return cachedKey;
}

async function readIds(): Promise<string[]> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return [];
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    const ids = payload.ids;
    return Array.isArray(ids) ? ids.map(String) : [];
  } catch {
    return [];
  }
}

export async function grantDraftAccess(submissionId: string): Promise<void> {
  const existing = await readIds();
  if (existing.includes(submissionId)) return;

  const ids = [submissionId, ...existing].slice(0, MAX_IDS);
  const token = await new SignJWT({ ids })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key());

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function hasDraftAccess(submissionId: string): Promise<boolean> {
  return (await readIds()).includes(submissionId);
}

/** Guard for the draft endpoints — returns a 403 Response when not the owner. */
export async function requireDraftAccess(
  submissionId: string,
): Promise<Response | null> {
  if (await hasDraftAccess(submissionId)) return null;
  return Response.json(
    { error: "This submission isn't available on this device." },
    { status: 403 },
  );
}
