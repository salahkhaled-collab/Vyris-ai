import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { WaitlistPage } from "@/components/marketing/WaitlistPage";

export const metadata: Metadata = {
  title: "AI chief of staff for founders",
  description:
    "Vyris is an AI chief of staff for founders who run the business themselves. It sorts your inbox, briefs you before meetings and chases stuck work. Join the waitlist for early access.",
  alternates: { canonical: "/" },
};

/** One front door: the waitlist. Signed-in users go straight to the app. */
export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) redirect(session.user.onboarded ? "/dashboard" : "/onboarding");
  return <WaitlistPage showLogin />;
}
