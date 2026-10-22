import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { BuyMarginControl } from "@/components/staff/BuyMarginControl";
import { EmailStatus } from "@/components/staff/EmailStatus";
import { emailTransport, emailFrom } from "@/lib/email";
import {
  buyMarginMeta,
  envBuyMargin,
  BUY_MARGIN_MIN,
  BUY_MARGIN_MAX,
} from "@/lib/settings";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * Pricing levers an administrator can pull without a deployment.
 *
 * Administrators only, checked here and again on the endpoint behind it. Every
 * change is written to the audit log: this page moves the opening price of
 * every offer in the country, so "who changed it, and when" has to be
 * answerable months later.
 */
export default async function SettingsPage() {
  const me = await getSessionUser();
  if (!me) redirect("/staff/login");
  if (me.role !== "ADMIN") redirect("/staff");

  const margin = await buyMarginMeta();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-extrabold text-ink-950">Settings</h1>
      <p className="mt-1 text-sm leading-relaxed text-ink-600">
        What the system proposes before an appraiser touches it, and whether
        what they send actually arrives.
      </p>

      <div className="mt-6">
        <BuyMarginControl
          initial={margin.value}
          min={BUY_MARGIN_MIN}
          max={BUY_MARGIN_MAX}
          fromDatabase={margin.fromDatabase}
          updatedAt={margin.updatedAt?.toISOString() ?? null}
          updatedBy={margin.updatedBy}
          envDefault={envBuyMargin()}
        />
      </div>

      <div className="mt-6">
        <EmailStatus
          transport={emailTransport()}
          from={emailFrom()}
          defaultTo={me.email}
        />
      </div>
    </div>
  );
}
