export interface PriorityItem {
  id: string;
  rank: number;
  title: string;
  context: string;
  due: string;
  urgency: "critical" | "high" | "normal";
  // Used to reorder the ledger by role emphasis — not shown in the UI.
  category: "decision" | "execution" | "external" | "brand";
}

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  meta: string;
  highlight: boolean;
}

export interface ActivityItem {
  id: string;
  text: string;
}

export interface MetricCard {
  id: string;
  label: string;
  value: string | number;
  sub: string;
  subTone: "signal" | "muted";
  category: "decision" | "execution" | "external" | "brand";
}

export interface DecisionOption {
  id: string;
  label: string;
  
  pros: string[];
  cons: string[];
  score: number; // 0-100
}

export interface Decision {
  id: string;
  title: string;
  context: string;
  status: "open" | "decided";
  deadline: string;
  options: DecisionOption[];
  recommendation?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  status: "active" | "paused";
  runsToday: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  department: string;
  status: "online" | "offline" | "away";
  timezone?: string;
  avatar?: string; // initials-based color seed
}

export interface TeamMessage {
  id: string;
  authorId: string; // "me" or member id
  content: string;
  timestamp: string;
  channel: "message" | "email";
}

export interface Notification {
  id: string;
  title: string;
  detail: string;
  source: string;
  time: string;
  read: boolean;
  type: "decision" | "meeting" | "task" | "ai" | "message";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
