import type { Metadata } from "next";
import { Wizard } from "@/components/wizard/Wizard";
import { findSpec, MAKES } from "@/lib/vehicles";

export const metadata: Metadata = {
  title: "Get your offer",
  description:
    "Tell us about your car, upload a few photos, and get a reviewed cash offer from M Lhuillier.",
  // Crawlable but not indexed: this is an application screen, and the crawler
  // has to be able to reach it to see this directive at all.
  robots: { index: false, follow: true },
};

export default async function SellPage({
  searchParams,
}: {
  searchParams: Promise<{ make?: string; model?: string }>;
}) {
  const sp = await searchParams;

  // The value guides link here with a model already chosen. Validate against
  // the catalogue so a hand-edited URL can't seed nonsense into the form.
  const make = sp.make && MAKES.includes(sp.make) ? sp.make : null;
  const spec = make ? findSpec(make, sp.model ?? "") : null;

  return (
    <Wizard
      prefill={
        make
          ? { make, model: spec?.name ?? "", bodyType: spec?.body ?? "" }
          : undefined
      }
    />
  );
}
