import { PlaceholderPage } from "@/components/ui/PlaceholderPage";
import { User } from "lucide-react";

export default function BrandPage() {
  return (
    <PlaceholderPage
      eyebrow="Direction"
      title="Personal Brand"
      icon={User}
      suggestions={[
        "Content calendar for posts/articles with Vela-drafted copy",
        "Press inquiry tracker (could reuse Contacts with a 'Press' tag — already supported there)",
        "Speaking/interview request inbox",
        "Could fold into Comms if it's mainly about outbound messaging",
      ]}
    />
  );
}
