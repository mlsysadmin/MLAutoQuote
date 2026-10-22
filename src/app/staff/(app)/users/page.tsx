import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { UserAdmin } from "@/components/staff/UserAdmin";

export const metadata: Metadata = {
  title: "Staff accounts",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * Who can get in, and as what.
 *
 * Administrators only — this page *is* the access list, so it is gated here as
 * well as on every endpoint behind it.
 */
export default async function UsersPage() {
  const me = await getSessionUser();
  if (!me) redirect("/staff/login");
  if (me.role !== "ADMIN") redirect("/staff");

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
      _count: { select: { offers: true } },
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink-950">Staff accounts</h1>
        <p className="mt-1 text-sm text-ink-600">
          Who can sign in, and what they&apos;re allowed to do. Every change
          here is recorded against your name.
        </p>
      </div>

      <UserAdmin
        currentUserId={me.id}
        users={users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          branch: u.branch,
          active: u.active,
          offersHandled: u._count.offers,
          lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
