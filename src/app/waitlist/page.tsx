import type { Metadata } from "next";
import { WaitlistPage } from "@/components/marketing/WaitlistPage";

export const metadata: Metadata = {
  title: "Join the waitlist",
  description:
    "Vyris is an AI chief of staff for founders who run the business themselves. It sorts your inbox, briefs you before meetings and chases stuck work. Join the waitlist for early access.",
  alternates: { canonical: "/waitlist" },
};

export default function Waitlist() {
  return <WaitlistPage />;
}
