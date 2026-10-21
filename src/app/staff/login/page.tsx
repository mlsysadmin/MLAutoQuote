import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { env } from "@/lib/env";
import { Brand, Logo } from "@/components/ui";
import { LoginForm } from "@/components/staff/LoginForm";

export const metadata: Metadata = {
  title: "Staff sign in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StaffLoginPage() {
  if (await getSessionUser()) redirect("/staff");

  return (
    <div className="flex min-h-dvh flex-col bg-ink-50">
      <main
        id="main"
        className="flex flex-1 items-center justify-center px-4 py-12"
      >
        <div className="w-full max-w-sm">
          <div className="flex justify-center">
            <Logo />
          </div>

          <div className="mt-8 rounded-2xl bg-white p-6 shadow-[0_2px_6px_rgb(31_29_27/0.06),0_14px_36px_rgb(31_29_27/0.08)] ring-1 ring-ink-200/70 sm:p-8">
            <h1 className="text-xl font-extrabold text-ink-950">
              Appraiser sign in
            </h1>
            <p className="mt-1 text-sm text-ink-600">
              For <Brand /> staff only.
            </p>

            <div className="mt-6">
              <LoginForm allowBlankPassword={env.allowBlankStaffPassword} />
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-ink-500">
            Trouble signing in? Contact your branch administrator.
          </p>
        </div>
      </main>
    </div>
  );
}
