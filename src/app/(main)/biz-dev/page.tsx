import { PlaceholderPage } from "@/components/ui/PlaceholderPage";
import { TrendingUp } from "lucide-react";

export default function BizDevPage() {
  return (
    <PlaceholderPage
      eyebrow="Direction"
      title="Business Development"
      icon={TrendingUp}
      suggestions={[
        "Pipeline tracker for partnerships/deals (could reuse the Contacts model)",
        "Outreach sequences with Vela-drafted follow-ups",
        "Deal stage kanban, similar structure to the Projects board",
        "Could merge into Contacts if it's mainly relationship tracking",
      ]}
    />
  );
}
