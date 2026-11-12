import { redirect } from "next/navigation";

/**
 * This page showed sample (fake) data and wasn't linked from the menu, so it
 * now sends people Home. The old mock-up is in git history (before commit
 * "Hide mock-data pages") if it's ever rebuilt on real data.
 */
export default function RetiredMockPage() {
  redirect("/dashboard");
}
