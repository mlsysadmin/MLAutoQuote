import type { Metadata } from "next";
import { Wizard } from "@/components/wizard/Wizard";

export const metadata: Metadata = {
  title: "Get your offer",
  description:
    "Tell us about your car, upload a few photos, and get a reviewed cash offer from M Lhuillier.",
  robots: { index: false, follow: false },
};

export default function SellPage() {
  return <Wizard />;
}
