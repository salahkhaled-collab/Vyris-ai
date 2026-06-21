import { PlaceholderPage } from "@/components/ui/PlaceholderPage";
import { Target } from "lucide-react";

export default function StrategyPage() {
  return (
    <PlaceholderPage
      eyebrow="Direction"
      title="Strategic Planning"
      icon={Target}
      suggestions={[
        "Quarterly OKRs with progress tracking",
        "A living strategy doc Vela helps draft and revise",
        "Scenario planning — model a few strategic options side by side",
        "Could merge into Decision Support rather than stand alone",
      ]}
    />
  );
}
