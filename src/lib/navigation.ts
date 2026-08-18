import {
  Target,
  GitBranch,
  Settings,
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
    label: "Advisory",
    items: [
      { label: "Strategic Planning", href: "/strategy", icon: Target, primary: true },
      { label: "Decision Support", href: "/decisions", icon: GitBranch },
    ],
  },
];

// Hidden until Strategic Planning + Decision Support have real users.
// Code and routes still exist — just not linked from nav.
// export const workNavigation: NavGroup = {
//   label: "Work",
//   items: [
//     { label: "Command Center", href: "/strategy", icon: LayoutStrategy, primary: true },
//     { label: "Inbox", href: "/inbox", icon: Bell },
//     { label: "Projects", href: "/projects", icon: FolderKanban },
//     { label: "Calendar", href: "/calendar", icon: Calendar },
//   ],
// };

// export const secondaryNavigation: NavGroup = {
//   label: "More",
//   items: [
//     { label: "Business Development", href: "/biz-dev", icon: TrendingUp },
//     { label: "Personal Brand", href: "/brand", icon: User },
//     { label: "Meetings", href: "/meetings", icon: Video },
//     { label: "Communications", href: "/comms", icon: MessageSquare },
//     { label: "AI & Automation", href: "/automation", icon: Bot },
//     { label: "Contacts", href: "/contacts", icon: Users },
//     { label: "Documents", href: "/documents", icon: FileText },
//   ],
// };

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