import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, hashPassword, writeAudit } from "@/lib/auth";
import { fieldErrors } from "@/lib/validation";
import { clientIp, clearFailures } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  role: z.enum(["ADMIN", "APPRAISER", "VIEWER"]).optional(),
  branch: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  active: z.boolean().optional(),
  password: z.string().min(8, "At least 8 characters.").max(200).optional(),
});

/** Changes a colleague's role, branch, access or password. */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireStaff("ADMIN");
  if (auth instanceof Response) return auth;

  const { id } = await params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "Check the details.", fields: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, active: true },
  });
  if (!target) {
    return Response.json({ error: "No such account." }, { status: 404 });
  }

  // Locking yourself out, or demoting yourself out of the admin role, leaves
  // nobody able to undo it from inside the app.
  if (target.id === auth.id) {
    if (parsed.data.active === false) {
      return Response.json(
        { error: "You can't deactivate your own account." },
        { status: 400 },
      );
    }
    if (parsed.data.role && parsed.data.role !== "ADMIN") {
      return Response.json(
        { error: "You can't remove your own administrator access." },
        { status: 400 },
      );
    }
  }

  // The same applies to the last administrator standing, whoever does it.
  const losingAdmin =
    target.role === "ADMIN" &&
    ((parsed.data.role && parsed.data.role !== "ADMIN") ||
      parsed.data.active === false);

  if (losingAdmin) {
    const remaining = await prisma.user.count({
      where: { role: "ADMIN", active: true, id: { not: target.id } },
    });
    if (remaining === 0) {
      return Response.json(
        {
          error:
            "This is the last active administrator. Promote someone else first.",
        },
        { status: 400 },
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.role !== undefined) data.role = parsed.data.role;
  if (parsed.data.branch !== undefined) data.branch = parsed.data.branch;
  if (parsed.data.active !== undefined) data.active = parsed.data.active;
  if (parsed.data.password) {
    data.passwordHash = await hashPassword(parsed.data.password);
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ ok: true });
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      branch: true,
      active: true,
    },
  });

  // A reset password or a reactivation should not be met by a stale lockout.
  if (parsed.data.password || parsed.data.active === true) {
    clearFailures(target.email);
  }

  await writeAudit({
    actorUserId: auth.id,
    action: "user.updated",
    entity: "User",
    entityId: id,
    ip: clientIp(req),
    meta: {
      email: target.email,
      // What changed, never the new password itself.
      changed: Object.keys(data).map((k) =>
        k === "passwordHash" ? "password" : k,
      ),
      role: parsed.data.role,
      active: parsed.data.active,
    },
  });

  return Response.json({ user });
}
