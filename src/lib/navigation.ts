import {
  LayoutDashboard,
  Target,
  GitBranch,
  FolderKanban,
  Video,
  MessageSquare,
  Briefcase,
  Bot,
  TrendingUp,
  User,
  Calendar,
  Users,
  FileText,
  Settings,
  Bell,
  DollarSign,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Command Center", href: "/dashboard", icon: LayoutDashboard },
      { label: "Inbox", href: "/inbox", icon: Bell },
    ],
  },
  {
    label: "Direction",
    items: [
      { label: "Strategic Planning", href: "/strategy", icon: Target },
      { label: "Decision Support", href: "/decisions", icon: GitBranch },
      { label: "Business Development", href: "/biz-dev", icon: TrendingUp },
      { label: "Personal Brand", href: "/brand", icon: User },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Projects", href: "/projects", icon: FolderKanban },
      { label: "Meetings", href: "/meetings", icon: Video },
      { label: "Communications", href: "/comms", icon: MessageSquare },
      { label: "Executive Ops", href: "/operations", icon: Briefcase },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Finance Command", href: "/finance", icon: DollarSign },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "AI & Automation", href: "/automation", icon: Bot },
      { label: "Calendar", href: "/calendar", icon: Calendar },
      { label: "Contacts", href: "/contacts", icon: Users },
      { label: "Documents", href: "/documents", icon: FileText },
    ],
  },
];

export const settingsItem: NavItem = {
  label: "Settings",
  href: "/settings",
  icon: Settings,
};
