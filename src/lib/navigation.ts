import {
  LayoutDashboard,
  Target,
  GitBranch,
  FolderKanban,
  Video,
  MessageSquare,
  Bot,
  TrendingUp,
  User,
  Calendar,
  Users,
  FileText,
  Settings,
  Bell,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  primary?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    label: "Work",
    items: [
      { label: "Command Center", href: "/dashboard", icon: LayoutDashboard, primary: true },
      { label: "Inbox", href: "/inbox", icon: Bell },
      { label: "Projects", href: "/projects", icon: FolderKanban },
      { label: "Calendar", href: "/calendar", icon: Calendar },
    ],
  },
  {
    label: "Advisory",
    items: [
      { label: "Strategic Planning", href: "/strategy", icon: Target },
      { label: "Decision Support", href: "/decisions", icon: GitBranch },
      { label: "Business Development", href: "/biz-dev", icon: TrendingUp },
    ],
  },
];

export const secondaryNavigation: NavGroup = {
  label: "More",
  items: [
    { label: "Personal Brand", href: "/brand", icon: User },
    { label: "Meetings", href: "/meetings", icon: Video },
    { label: "Communications", href: "/comms", icon: MessageSquare },
    // Executive Ops — page not built yet, hidden from nav until ready
    // { label: "Executive Ops", href: "/operations", icon: Briefcase },
    { label: "AI & Automation", href: "/automation", icon: Bot },
    { label: "Contacts", href: "/contacts", icon: Users },
    { label: "Documents", href: "/documents", icon: FileText },
  ],
};

// Finance group hidden — Finance Command page not built yet
// export const financeNavigation: NavGroup = {
//   label: "Finance",
//   items: [
//     { label: "Finance Command", href: "/finance", icon: DollarSign },
//   ],
// };

export const settingsItem: NavItem = {
  label: "Settings",
  href: "/settings",
  icon: Settings,
};