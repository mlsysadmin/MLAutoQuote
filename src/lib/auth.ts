import "server-only";

import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { env } from "./env";
import { getSessionUser, type SessionUser } from "./session";

const BCRYPT_ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Looks up a user and checks the password. Always runs a bcrypt comparison,
 * even for an unknown email, so response time doesn't reveal which accounts
 * exist.
 */
const DUMMY_HASH = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.X7ZQvYLPEhFfJmSOXgJZ3q.Qb2Iu";

export async function authenticate(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
      active: true,
    },
  });

  // With AUTH_ALLOW_BLANK_PASSWORD on (development only — see env.ts), an empty
  // box is accepted for an account that exists and is active. The account still
  // has to be real: this skips the password, not the lookup.
  const skipPassword =
    env.allowBlankStaffPassword && password.trim().length === 0;

  const ok = skipPassword
    ? true
    : await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !user.active || !ok) return null;

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

const RANK: Record<Role, number> = { VIEWER: 0, APPRAISER: 1, ADMIN: 2 };

export function hasRole(user: SessionUser, minimum: Role): boolean {
  return RANK[user.role] >= RANK[minimum];
}

/**
 * Guard for route handlers. Returns the user, or a Response to return directly.
 *
 *   const auth = await requireStaff("APPRAISER");
 *   if (auth instanceof Response) return auth;
 */
export async function requireStaff(
  minimum: Role = "VIEWER",
): Promise<SessionUser | Response> {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!hasRole(user, minimum)) {
    return Response.json(
      { error: "You don't have access to this action." },
      { status: 403 },
    );
  }
  return user;
}

export async function writeAudit(input: {
  actorUserId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  meta?: unknown;
  ip?: string | null;
}): Promise<void> {
  // Audit must never take down the action it is recording.
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        meta: (input.meta ?? null) as never,
        ip: input.ip ?? null,
      },
    });
  } catch (err) {
    console.error("audit write failed", err);
  }
}
