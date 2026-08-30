import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/LandingPage";

export const metadata: Metadata = {
  title: "AI Chief of Staff for solo operators",
  description:
    "Vyris is the AI Chief of Staff for solo operators running e-commerce, agency, or content businesses — one place for your goals, your bigger bets, and the decisions you're weighing right now.",
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return <LandingPage />;
}
