import { randomBytes } from "node:crypto";

/** Characters that survive being read aloud over the phone or written by hand. */
const UNAMBIGUOUS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Short reference a customer can quote at a branch, e.g. "MLA-7K3QD2".
 * 32^6 ≈ 1.07 billion combinations; collisions are retried at the call site.
 */
export function makeRefCode(): string {
  const bytes = randomBytes(6);
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += UNAMBIGUOUS[bytes[i] % UNAMBIGUOUS.length];
  }
  return `MLA-${out}`;
}

/**
 * The secret in a customer's tracking link. 32 bytes of entropy, URL-safe —
 * this is the only thing standing between a stranger and someone's offer.
 */
export function makePublicToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Opaque, collision-resistant object key segment for uploaded files. */
export function makeStorageId(): string {
  return randomBytes(16).toString("hex");
}
