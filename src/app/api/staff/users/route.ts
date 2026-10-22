import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, hashPassword, writeAudit } from "@/lib/auth";
import { fieldErrors } from "@/lib/validation";
import { clientIp } from "@/lib/rate-limit";
import { DEFAULT_STAFF_PASSWORD } from "@/lib/staff-users";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid work email."),
  name: z.string().trim().min(2, "Enter their full name.").max(120),
  role: z.enum(["ADMIN", "APPRAISER", "VIEWER"]),
  branch: z
    .string()
    .trim()
    .max(120)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  password: z.string().min(8, "At least 8 characters.").max(200).optional(),
});

/** Everyone with an account. Admin-only: this is the access list. */
export async function GET() {
  const auth = await requireStaff("ADMIN");
  if (auth instanceof Response) return auth;

  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      branch: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { offers: true } },
    },
  });

  return Response.json({ users });
}

/** Creates an account. */
export async function POST(req: Request) {
  const auth = await requireStaff("ADMIN");
  if (auth instanceof Response) return auth;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "Check the details.", fields: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (existing) {
    return Response.json(
      { error: "Someone already has that email.", fields: { email: "Already in use." } },
      { status: 409 },
    );
  }

  const password = parsed.data.password ?? DEFAULT_STAFF_PASSWORD;

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
      branch: parsed.data.branch ?? null,
      passwordHash: await hashPassword(password),
    },
    select: { id: true, email: true, name: true, role: true },
  });

  await writeAudit({
    actorUserId: auth.id,
    action: "user.created",
    entity: "User",
    entityId: user.id,
    ip: clientIp(req),
    // The password never reaches the audit log, only whether a custom one was set.
    meta: { email: user.email, role: user.role, customPassword: Boolean(parsed.data.password) },
  });

  return Response.json({ user, password }, { status: 201 });
}
