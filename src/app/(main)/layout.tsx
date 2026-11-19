import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { GlobalAIChat } from "@/components/layout/GlobalAIChat";
import { ActivityPing } from "@/components/layout/ActivityPing";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      {/* Room at the end of every page's scroll area: on desktop to clear the floating
          "Ask Vyris" button, on phones for page actions that float above the tab bar. */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden pb-16 lg:pb-0 [&_main]:pb-24 lg:[&_main]:pb-28">
        {children}
      </div>
      <MobileNav />
      <CommandPalette />
      <GlobalAIChat />
      <ActivityPing />
    </div>
  );
}
