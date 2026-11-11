import type { Metadata } from "next";
import { WaitlistSuccess } from "@/components/marketing/WaitlistSuccess";

export const metadata: Metadata = {
  title: "You're on the list",
  description: "You've joined the Vyris waitlist.",
  robots: { index: false, follow: false },
};

export default function WaitlistSuccessPage() {
  return <WaitlistSuccess />;
}
