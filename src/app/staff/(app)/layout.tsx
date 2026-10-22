import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/session";
import { Logo } from "@/components/ui";
import { SignOutButton } from "@/components/staff/SignOutButton";

export const metadata: Metadata = {
  title: { default: "Appraiser queue", template: "%s · AutoQuote Staff" },
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * Everyone signed in sees the same sections and the pages are read-only for a
 * VIEWER, except Accounts: that page is the access list, so only an
 * administrator is offered it — and the page itself checks again.
 */
const NAV = [
  { href: "/staff", label: "Queue" },
  { href: "/staff/customers", label: "Customers" },
  { href: "/staff/vehicles", label: "Vehicles" },
  { href: "/staff/dashboard", label: "Trends" },
  { href: "/staff/users", label: "Accounts", adminOnly: true },
  { href: "/staff/settings", label: "Settings", adminOnly: true },
];

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/staff/login");

  return (
    <div className="min-h-dvh bg-ink-50">
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-5">
            <Link href="/staff" aria-label="Appraiser queue">
              <Logo />
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV.filter((item) => !item.adminOnly || user.role === "ADMIN").map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-100"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold leading-tight text-ink-900">
                {user.name}
              </p>
              <p className="text-[0.7rem] font-medium uppercase tracking-wider text-ink-500">
                {user.role.toLowerCase()}
              </p>
            </div>
            <SignOutButton />
          </div>
        </div>

        {/* On a phone the nav moves below the brand so it doesn't crowd it. */}
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 sm:hidden">
          {NAV.filter((item) => !item.adminOnly || user.role === "ADMIN").map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold text-ink-700 hover:bg-ink-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main id="main">{children}</main>
    </div>
  );
}
