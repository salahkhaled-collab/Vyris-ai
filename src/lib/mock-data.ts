import {
  PriorityItem,
  ScheduleItem,
  ActivityItem,
  MetricCard,
  Decision,
  AutomationRule,
  ChatMessage,
  Notification,
  TeamMember,
  TeamMessage,
} from "@/types";

// ── Command Center ──────────────────────────────────────────

export const metrics: MetricCard[] = [
  { id: "decisions", label: "Open Decisions", value: 3, sub: "2 due today", subTone: "signal", category: "decision" },
  { id: "projects", label: "Active Projects", value: 12, sub: "4 at risk", subTone: "muted", category: "execution" },
  { id: "meetings", label: "Meetings Today", value: 5, sub: "Next in 42 min", subTone: "muted", category: "external" },
  { id: "inbox", label: "Inbox Triage", value: 18, sub: "Vela drafted 11 replies", subTone: "signal", category: "execution" },
];

export const priorityLedger: PriorityItem[] = [
  {
    id: "p1",
    rank: 1,
    title: "Approve Q3 partnership terms",
    context: "Decision Support · Legal reviewed",
    due: "Due 11:00",
    urgency: "critical",
    category: "decision",
  },
  {
    id: "p2",
    rank: 2,
    title: "Confirm shifted launch timeline with engineering",
    context: "Projects · Aurora Launch",
    due: "Due 14:00",
    urgency: "normal",
    category: "execution",
  },
  {
    id: "p3",
    rank: 3,
    title: "Finalize agenda item for investor sync",
    context: "Meetings · 2:00 PM call",
    due: "Due 13:30",
    urgency: "high",
    category: "external",
  },
  {
    id: "p4",
    rank: 4,
    title: "Respond to press inquiry — Forbes",
    context: "Personal Brand · Draft ready",
    due: "Tomorrow",
    urgency: "normal",
    category: "brand",
  },
  {
    id: "p5",
    rank: 5,
    title: "Review automation rules for inbox triage",
    context: "AI & Automation",
    due: "This week",
    urgency: "normal",
    category: "execution",
  },
];

export const todaysSchedule: ScheduleItem[] = [
  { id: "s1", time: "09:30", title: "Leadership standup", meta: "15 min · Recurring", highlight: true },
  { id: "s2", time: "11:00", title: "Partnership terms — sign-off", meta: "30 min · w/ Legal", highlight: false },
  { id: "s3", time: "14:00", title: "Investor group sync", meta: "45 min · 3 attendees", highlight: false },
  { id: "s4", time: "16:30", title: "1:1 — Head of Product", meta: "30 min", highlight: false },
];

export const velaActivity: ActivityItem[] = [
  { id: "a1", text: "Drafted 11 email replies, awaiting your approval" },
  { id: "a2", text: "Summarized Tuesday's board call into 4 action items" },
  { id: "a3", text: "Flagged a scheduling conflict next Thursday" },
  { id: "a4", text: "Prepared briefing notes for investor sync" },
];

// ── Decision Support ────────────────────────────────────────

export const decisions: Decision[] = [
  {
    id: "d1",
    title: "Approve Q3 partnership terms with Northwind",
    context:
      "Northwind has proposed a revised revenue-share structure for the Q3 distribution agreement. Legal has completed review. Three structural options remain on the table.",
    status: "open",
    deadline: "Today, 11:00",
    options: [
      {
        id: "o1",
        label: "Accept revised 70/30 split",
        pros: ["Faster signing, preserves relationship", "Matches market benchmark"],
        cons: ["3% lower margin than original ask"],
        score: 82,
      },
      {
        id: "o2",
        label: "Counter with 75/25 + volume tiers",
        pros: ["Protects margin on high volume", "Aligns incentives long-term"],
        cons: ["Adds 1-2 weeks to negotiation", "May signal distrust"],
        score: 68,
      },
      {
        id: "o3",
        label: "Hold for Q4 renegotiation window",
        pros: ["No immediate concession needed"],
        cons: ["Delays launch dependent on this deal", "Northwind may walk"],
        score: 41,
      },
    ],
    recommendation: "Option 1 — the margin difference is within tolerance and the launch dependency makes speed the dominant factor.",
  },
  {
    id: "d2",
    title: "Select vendor for executive travel management",
    context:
      "Three vendors shortlisted after RFP process. Decision affects travel policy for 40+ executives starting next quarter.",
    status: "open",
    deadline: "This week",
    options: [
      {
        id: "o4",
        label: "TravelCorp Enterprise",
        pros: ["Best-in-class support SLA", "Existing integration with expense system"],
        cons: ["Highest cost per booking"],
        score: 75,
      },
      {
        id: "o5",
        label: "Skyline Business Travel",
        pros: ["Lower cost", "Strong international coverage"],
        cons: ["No direct expense integration yet"],
        score: 64,
      },
    ],
  },
  {
    id: "d3",
    title: "Office lease renewal — downtown HQ",
    context: "Lease expires in 90 days. Landlord has offered renewal terms with a 4% increase.",
    status: "decided",
    deadline: "Decided last week",
    options: [
      {
        id: "o6",
        label: "Renew at offered terms",
        pros: ["Avoids relocation disruption", "Locks in below-market rate vs. comps"],
        cons: ["4% cost increase"],
        score: 88,
      },
    ],
    recommendation: "Renewed for 3 years at offered terms.",
  },
];

// ── AI & Automation ──────────────────────────────────────────

export const automationRules: AutomationRule[] = [
  {
    id: "r1",
    name: "Inbox triage & draft replies",
    trigger: "New email from VIP contact list",
    action: "Summarize, categorize, and draft a reply for approval",
    status: "active",
    runsToday: 18,
  },
  {
    id: "r2",
    name: "Meeting prep briefings",
    trigger: "60 minutes before any calendar event with 2+ attendees",
    action: "Compile briefing doc from recent emails, notes, and CRM context",
    status: "active",
    runsToday: 5,
  },
  {
    id: "r3",
    name: "Action item extraction",
    trigger: "Meeting transcript uploaded",
    action: "Extract action items and assign owners based on attendee roles",
    status: "active",
    runsToday: 2,
  },
  {
    id: "r4",
    name: "Weekly investor digest",
    trigger: "Every Friday at 16:00",
    action: "Compile KPI summary and send draft digest for review",
    status: "paused",
    runsToday: 0,
  },
  {
    id: "r5",
    name: "Schedule conflict detection",
    trigger: "New calendar event created",
    action: "Check for conflicts and travel-time feasibility, flag if found",
    status: "active",
    runsToday: 1,
  },
];

export const initialChatMessages: ChatMessage[] = [
  {
    id: "c1",
    role: "assistant",
    content:
      "Good morning. You have 3 open decisions and a tight schedule today. The Northwind partnership terms are the most time-sensitive — want a summary?",
    timestamp: "08:02",
  },
  {
    id: "c2",
    role: "user",
    content: "Yes, give me the summary and your recommendation.",
    timestamp: "08:03",
  },
  {
    id: "c3",
    role: "assistant",
    content:
      "Northwind proposed a 70/30 revenue split, down from your original 73/27 ask. Legal has cleared it. Given the Aurora launch depends on this agreement closing this week, I'd recommend accepting — the 3% margin difference is within your stated tolerance, and the alternative (countering with tiers) adds 1-2 weeks you don't have.",
    timestamp: "08:03",
  },
];

// ── Inbox / Notifications ────────────────────────────────────

export const notifications: Notification[] = [
  {
    id: "n1",
    title: "Northwind partnership terms ready for sign-off",
    detail: "Legal completed review. Decision due by 11:00.",
    source: "Decision Support",
    time: "12 min ago",
    read: false,
    type: "decision",
  },
  {
    id: "n2",
    title: "Vela drafted 11 email replies",
    detail: "Awaiting your approval before sending.",
    source: "AI & Automation",
    time: "28 min ago",
    read: false,
    type: "ai",
  },
  {
    id: "n3",
    title: "Aurora Launch timeline shifted by 4 days",
    detail: "Engineering flagged a dependency delay on the API integration.",
    source: "Projects",
    time: "1 hr ago",
    read: false,
    type: "task",
  },
  {
    id: "n4",
    title: "Investor sync agenda still has an open item",
    detail: "Topic: Q3 runway extension — needs your input before 14:00.",
    source: "Meetings",
    time: "2 hr ago",
    read: true,
    type: "meeting",
  },
  {
    id: "n5",
    title: "New message from Head of Product",
    detail: "\"Can we move our 1:1 to tomorrow morning instead?\"",
    source: "Communications",
    time: "3 hr ago",
    read: true,
    type: "message",
  },
  {
    id: "n6",
    title: "Weekly investor digest paused",
    detail: "Automation rule is paused — no digest will be sent Friday.",
    source: "AI & Automation",
    time: "Yesterday",
    read: true,
    type: "ai",
  },
];

// ── Team ──────────────────────────────────────────────────────

export const teamMembers: TeamMember[] = [
  {
    id: "m1",
    name: "Maya Chen",
    role: "Head of Product",
    department: "Product",
    email: "maya@vela.app",
    phone: "+1 (415) 555-0182",
    status: "online",
    timezone: "PST · San Francisco",
  },
  {
    id: "m2",
    name: "David Okafor",
    role: "VP Engineering",
    department: "Engineering",
    email: "david@vela.app",
    phone: "+1 (212) 555-0347",
    status: "online",
    timezone: "EST · New York",
  },
  {
    id: "m3",
    name: "Priya Nair",
    role: "Head of Marketing",
    department: "Marketing",
    email: "priya@vela.app",
    phone: "+44 20 7946 0821",
    status: "away",
    timezone: "GMT · London",
  },
  {
    id: "m4",
    name: "Tom Reyes",
    role: "Finance Lead",
    department: "Finance",
    email: "tom@vela.app",
    phone: "+1 (312) 555-0593",
    status: "offline",
    timezone: "CST · Chicago",
  },
  {
    id: "m5",
    name: "Sarah Klein",
    role: "Operations Manager",
    department: "Operations",
    email: "sarah@vela.app",
    phone: "+1 (650) 555-0274",
    status: "online",
    timezone: "PST · San Francisco",
  },
  {
    id: "m6",
    name: "James Whitfield",
    role: "General Counsel",
    department: "Legal",
    email: "james@vela.app",
    phone: "+1 (202) 555-0461",
    status: "online",
    timezone: "EST · Washington D.C.",
  },
  {
    id: "m7",
    name: "Aisha Oduya",
    role: "Chief of Staff",
    department: "Executive",
    email: "aisha@vela.app",
    phone: "+1 (415) 555-0739",
    status: "away",
    timezone: "PST · San Francisco",
  },
  {
    id: "m8",
    name: "Leo Martínez",
    role: "Head of Design",
    department: "Design",
    email: "leo@vela.app",
    phone: "+34 91 555 0126",
    status: "online",
    timezone: "CET · Barcelona",
  },
];

export const teamConversations: Record<string, TeamMessage[]> = {
  m1: [
    {
      id: "t1",
      authorId: "m1",
      content: "Can we move our 1:1 to tomorrow morning instead?",
      timestamp: "3 hr ago",
      channel: "message",
    },
  ],
  m2: [
    {
      id: "t2",
      authorId: "me",
      content: "Heads up — the Aurora timeline shifted by 4 days. Can your team absorb that?",
      timestamp: "Yesterday",
      channel: "message",
    },
    {
      id: "t3",
      authorId: "m2",
      content: "Yes, we adjusted the sprint plan already. Should be fine.",
      timestamp: "Yesterday",
      channel: "message",
    },
  ],
};
