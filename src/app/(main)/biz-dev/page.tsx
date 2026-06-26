"use client";

import { useState, useMemo } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  DollarSign,
  Handshake,
  Clock,
  ArrowRight,
  Plus,
  X,
  ChevronDown,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  ExternalLink,
  GripVertical,
  MoreHorizontal,
  Building2,
  User,
  Target,
  Zap,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type DealStage = "lead" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
type DealPriority = "high" | "medium" | "low";
type ActivityType = "email" | "call" | "meeting" | "note";

interface Deal {
  id: string;
  company: string;
  contact: string;
  contactRole: string;
  value: number;
  stage: DealStage;
  priority: DealPriority;
  probability: number;
  nextAction: string;
  nextActionDate: string;
  lastActivity: string;
  source: string;
  notes?: string;
}

interface OutreachItem {
  id: string;
  type: ActivityType;
  company: string;
  contact: string;
  summary: string;
  time: string;
  aiDrafted?: boolean;
}

interface VelaInsight {
  id: string;
  text: string;
  type: "opportunity" | "risk" | "action";
}

// ── Mock Data ──────────────────────────────────────────────────────────────────

const DEALS: Deal[] = [
  {
    id: "deal1",
    company: "Meridian Health Systems",
    contact: "Rachel Torres",
    contactRole: "VP of Partnerships",
    value: 480000,
    stage: "negotiation",
    priority: "high",
    probability: 75,
    nextAction: "Send revised contract terms",
    nextActionDate: "Today",
    lastActivity: "Call 2 hours ago",
    source: "Referral",
  },
  {
    id: "deal2",
    company: "Atlas Financial Group",
    contact: "James Liu",
    contactRole: "Head of Strategy",
    value: 320000,
    stage: "proposal",
    priority: "high",
    probability: 60,
    nextAction: "Follow up on proposal review",
    nextActionDate: "Tomorrow",
    lastActivity: "Email yesterday",
    source: "Inbound",
  },
  {
    id: "deal3",
    company: "Vertex Technologies",
    contact: "Samira Patel",
    contactRole: "CTO",
    value: 750000,
    stage: "qualified",
    priority: "medium",
    probability: 40,
    nextAction: "Schedule technical deep-dive",
    nextActionDate: "This week",
    lastActivity: "Meeting 3 days ago",
    source: "Conference",
  },
  {
    id: "deal4",
    company: "Northwind Logistics",
    contact: "Erik Johansson",
    contactRole: "COO",
    value: 195000,
    stage: "negotiation",
    priority: "medium",
    probability: 80,
    nextAction: "Legal review of final terms",
    nextActionDate: "Wed",
    lastActivity: "Email today",
    source: "Outbound",
  },
  {
    id: "deal5",
    company: "Solaris Energy",
    contact: "Mei Zhang",
    contactRole: "Director of Innovation",
    value: 560000,
    stage: "lead",
    priority: "medium",
    probability: 20,
    nextAction: "Initial discovery call",
    nextActionDate: "Thu",
    lastActivity: "LinkedIn DM",
    source: "Outbound",
  },
  {
    id: "deal6",
    company: "Cascade Media",
    contact: "Olivia Hart",
    contactRole: "CMO",
    value: 240000,
    stage: "proposal",
    priority: "low",
    probability: 45,
    nextAction: "Customize demo deck",
    nextActionDate: "Next week",
    lastActivity: "Email 4 days ago",
    source: "Inbound",
  },
  {
    id: "deal7",
    company: "Ironclad Industries",
    contact: "Marcus Webb",
    contactRole: "CEO",
    value: 1200000,
    stage: "lead",
    priority: "high",
    probability: 15,
    nextAction: "Research and qualify",
    nextActionDate: "This week",
    lastActivity: "Warm intro received",
    source: "Referral",
  },
  {
    id: "deal8",
    company: "Pinnacle Advisory",
    contact: "Nadia Kowalski",
    contactRole: "Managing Partner",
    value: 380000,
    stage: "closed_won",
    priority: "high",
    probability: 100,
    nextAction: "Onboarding kickoff",
    nextActionDate: "Mon",
    lastActivity: "Contract signed",
    source: "Referral",
  },
  {
    id: "deal9",
    company: "Brightpath Education",
    contact: "Daniel Brooks",
    contactRole: "Head of Partnerships",
    value: 165000,
    stage: "closed_lost",
    priority: "low",
    probability: 0,
    nextAction: "Re-engage in Q4",
    nextActionDate: "Sep",
    lastActivity: "Declined — budget freeze",
    source: "Inbound",
  },
  {
    id: "deal10",
    company: "AeroVault",
    contact: "Liam Chen",
    contactRole: "VP Product",
    value: 420000,
    stage: "qualified",
    priority: "high",
    probability: 50,
    nextAction: "Send case study deck",
    nextActionDate: "Tomorrow",
    lastActivity: "Discovery call today",
    source: "Conference",
  },
];

const RECENT_ACTIVITY: OutreachItem[] = [
  { id: "a1", type: "call",    company: "Meridian Health",   contact: "Rachel Torres", summary: "Discussed revised pricing — they're aligned on scope, want adjusted payment terms", time: "2 hr ago" },
  { id: "a2", type: "email",   company: "Atlas Financial",   contact: "James Liu",     summary: "Vela drafted follow-up on proposal. Awaiting your review.", time: "4 hr ago", aiDrafted: true },
  { id: "a3", type: "meeting", company: "AeroVault",         contact: "Liam Chen",     summary: "45-min discovery call — strong product fit, budget confirmed for Q3", time: "Today, 10:00" },
  { id: "a4", type: "email",   company: "Northwind Logistics", contact: "Erik Johansson", summary: "Sent final contract draft with updated SLA terms", time: "Today, 09:15" },
  { id: "a5", type: "note",    company: "Ironclad Industries", contact: "Marcus Webb",  summary: "Warm intro from Sarah K. — large enterprise, long sales cycle expected", time: "Yesterday" },
  { id: "a6", type: "email",   company: "Cascade Media",     contact: "Olivia Hart",   summary: "Vela prepared personalized demo deck based on their media verticals", time: "Yesterday", aiDrafted: true },
];

const VELA_INSIGHTS: VelaInsight[] = [
  { id: "i1", text: "Meridian Health deal is 2x more likely to close if contract revisions are sent today — their board meets Friday.", type: "action" },
  { id: "i2", text: "Atlas Financial hasn't opened the proposal in 48 hours. Suggest a brief check-in call.", type: "risk" },
  { id: "i3", text: "Ironclad Industries matches your ideal customer profile — similar to Pinnacle Advisory (closed $380K last month).", type: "opportunity" },
  { id: "i4", text: "Pipeline velocity has improved 18% this month. You're on track to exceed Q3 target by $240K.", type: "opportunity" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<DealStage, { label: string; color: string; dotColor: string }> = {
  lead:         { label: "Lead",          color: "text-muted bg-panel-2",                dotColor: "bg-white/30" },
  qualified:    { label: "Qualified",     color: "text-violet-400 bg-violet-500/[0.12]", dotColor: "bg-violet-400" },
  proposal:     { label: "Proposal",      color: "text-sky-400 bg-sky-500/[0.12]",       dotColor: "bg-sky-400" },
  negotiation:  { label: "Negotiation",   color: "text-brass bg-brass-soft",             dotColor: "bg-brass" },
  closed_won:   { label: "Closed Won",    color: "text-signal bg-signal/[0.12]",         dotColor: "bg-signal" },
  closed_lost:  { label: "Closed Lost",   color: "text-red-400 bg-red-500/[0.12]",       dotColor: "bg-red-400" },
};

const PRIORITY_TONE: Record<DealPriority, string> = {
  high:   "text-brass",
  medium: "text-muted",
  low:    "text-muted/60",
};

const ACTIVITY_ICON: Record<ActivityType, typeof Mail> = {
  email:   Mail,
  call:    Phone,
  meeting: Calendar,
  note:    Target,
};

const ACTIVITY_TONE: Record<ActivityType, string> = {
  email:   "bg-sky-500/[0.12] text-sky-400",
  call:    "bg-emerald-500/[0.12] text-emerald-400",
  meeting: "bg-violet-500/[0.12] text-violet-400",
  note:    "bg-amber-500/[0.12] text-amber-400",
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  "from-violet-500/40 to-violet-600/20 text-violet-300",
  "from-sky-500/40 to-sky-600/20 text-sky-300",
  "from-emerald-500/40 to-emerald-600/20 text-emerald-300",
  "from-pink-500/40 to-pink-600/20 text-pink-300",
  "from-amber-500/40 to-amber-600/20 text-amber-300",
  "from-teal-500/40 to-teal-600/20 text-teal-300",
  "from-rose-500/40 to-rose-600/20 text-rose-300",
  "from-indigo-500/40 to-indigo-600/20 text-indigo-300",
];

function avatarColor(id: string) {
  const n = parseInt(id.replace(/\D/g, ""), 10) || 0;
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PipelineMetrics({ deals }: { deals: Deal[] }) {
  const activeDeals = deals.filter(d => d.stage !== "closed_won" && d.stage !== "closed_lost");
  const pipelineValue = activeDeals.reduce((sum, d) => sum + d.value, 0);
  const weightedValue = activeDeals.reduce((sum, d) => sum + d.value * (d.probability / 100), 0);
  const wonValue = deals.filter(d => d.stage === "closed_won").reduce((sum, d) => sum + d.value, 0);
  const avgDealSize = activeDeals.length > 0 ? pipelineValue / activeDeals.length : 0;

  const items = [
    { label: "Pipeline Value",   value: formatCurrency(pipelineValue), sub: `${activeDeals.length} active deals`, subTone: "muted" as const, icon: TrendingUp },
    { label: "Weighted Forecast", value: formatCurrency(weightedValue), sub: "Probability-adjusted", subTone: "muted" as const, icon: Target },
    { label: "Closed This Quarter", value: formatCurrency(wonValue),   sub: "1 deal closed",        subTone: "signal" as const, icon: Handshake },
    { label: "Avg Deal Size",    value: formatCurrency(avgDealSize),   sub: "Across pipeline",      subTone: "muted" as const, icon: DollarSign },
  ];

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((m, i) => {
        const Icon = m.icon;
        return (
          <Panel key={i} className="p-5 rounded-xl group hover:border-white/[0.12] transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
                {m.label}
              </div>
              <div className="w-8 h-8 rounded-lg bg-panel-2 flex items-center justify-center group-hover:bg-brass-soft transition-colors">
                <Icon className="w-4 h-4 text-muted group-hover:text-brass transition-colors" strokeWidth={1.75} />
              </div>
            </div>
            <div className="font-display text-3xl">{m.value}</div>
            <div className={cn("text-xs mt-1", m.subTone === "signal" ? "text-signal" : "text-muted")}>
              {m.sub}
            </div>
          </Panel>
        );
      })}
    </section>
  );
}

// ── Kanban Pipeline ────────────────────────────────────────────────────────────

const PIPELINE_STAGES: DealStage[] = ["lead", "qualified", "proposal", "negotiation", "closed_won"];

function DealCard({ deal, onViewDeal }: { deal: Deal; onViewDeal: (deal: Deal) => void }) {
  const stageConf = STAGE_CONFIG[deal.stage];

  return (
    <button
      onClick={() => onViewDeal(deal)}
      className="w-full text-left bg-panel border border-line rounded-xl p-4 hover:border-white/[0.12] hover:shadow-[0_4px_24px_rgba(0,0,0,0.3)] transition-all duration-300 group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-xs font-display font-semibold shrink-0", avatarColor(deal.id))}>
            {initials(deal.company)}
          </div>
          <div>
            <div className="text-sm font-medium leading-tight">{deal.company}</div>
            <div className="text-xs text-muted mt-0.5">{deal.contact}</div>
          </div>
        </div>
        <MoreHorizontal className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" strokeWidth={1.75} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="font-display text-lg">{formatCurrency(deal.value)}</span>
        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", PRIORITY_TONE[deal.priority])}>
          {deal.priority === "high" ? "●" : deal.priority === "medium" ? "◐" : "○"} {deal.priority}
        </span>
      </div>

      {/* Probability bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-muted mb-1">
          <span>Win probability</span>
          <span className="font-mono">{deal.probability}%</span>
        </div>
        <div className="h-1 rounded-full bg-panel-2 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", deal.probability >= 70 ? "bg-signal" : deal.probability >= 40 ? "bg-brass" : "bg-muted")}
            style={{ width: `${deal.probability}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Clock className="w-3 h-3 shrink-0" strokeWidth={2} />
        <span className="truncate">{deal.nextAction}</span>
      </div>
      <div className="text-[10px] text-muted/70 mt-1 ml-[18px]">{deal.nextActionDate}</div>
    </button>
  );
}

function PipelineBoard({ deals, onViewDeal }: { deals: Deal[]; onViewDeal: (deal: Deal) => void }) {
  return (
    <Panel className="overflow-hidden">
      <div className="px-6 py-5 flex items-center justify-between border-b border-line">
        <h3 className="font-display text-xl">Deal Pipeline</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted">
            {deals.filter(d => d.stage !== "closed_lost").length} deals
          </span>
        </div>
      </div>

      <div className="overflow-x-auto scroll-thin">
        <div className="flex gap-0 min-w-[1000px]">
          {PIPELINE_STAGES.map((stage, idx) => {
            const stageConf = STAGE_CONFIG[stage];
            const stageDeals = deals.filter(d => d.stage === stage);
            const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0);

            return (
              <div
                key={stage}
                className={cn("flex-1 min-w-[200px] p-4", idx < PIPELINE_STAGES.length - 1 && "border-r border-line")}
              >
                {/* Stage header */}
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("w-2 h-2 rounded-full", stageConf.dotColor)} />
                  <span className="text-xs font-medium">{stageConf.label}</span>
                  <span className="text-[10px] font-mono text-muted ml-auto">{stageDeals.length}</span>
                </div>
                <div className="text-[10px] text-muted mb-4 ml-4">{formatCurrency(stageValue)}</div>

                {/* Cards */}
                <div className="space-y-3">
                  {stageDeals.map(deal => (
                    <DealCard key={deal.id} deal={deal} onViewDeal={onViewDeal} />
                  ))}

                  {stageDeals.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="text-xs text-muted/50">No deals</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

// ── Deal Detail Drawer ─────────────────────────────────────────────────────────

function DealDrawer({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const stageConf = STAGE_CONFIG[deal.stage];
  const activities = RECENT_ACTIVITY.filter(a => a.company.startsWith(deal.company.split(" ")[0]));

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-panel border-l border-line shadow-2xl flex flex-col h-full animate-in slide-in-from-right"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-line shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted">Deal Details</div>
            <h2 className="font-display text-xl mt-1">{deal.company}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-panel-2 text-muted hover:text-ink-text transition-all"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scroll-thin px-6 py-6 space-y-6">
          {/* Quick info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-panel-2 border border-line p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1">Value</div>
              <div className="font-display text-2xl">{formatCurrency(deal.value)}</div>
            </div>
            <div className="rounded-xl bg-panel-2 border border-line p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1">Probability</div>
              <div className="font-display text-2xl">{deal.probability}%</div>
              <div className="h-1 rounded-full bg-ink overflow-hidden mt-2">
                <div
                  className={cn("h-full rounded-full", deal.probability >= 70 ? "bg-signal" : deal.probability >= 40 ? "bg-brass" : "bg-muted")}
                  style={{ width: `${deal.probability}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stage & Priority */}
          <div className="flex items-center gap-3">
            <span className={cn("text-xs px-3 py-1.5 rounded-full", stageConf.color)}>
              {stageConf.label}
            </span>
            <span className="text-xs px-3 py-1.5 rounded-full bg-panel-2 text-muted">
              {deal.priority} priority
            </span>
            <span className="text-xs px-3 py-1.5 rounded-full bg-panel-2 text-muted">
              {deal.source}
            </span>
          </div>

          {/* Contact */}
          <div className="rounded-xl bg-panel-2 border border-line p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted mb-3">Contact</div>
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-sm font-display font-semibold", avatarColor(deal.id))}>
                {initials(deal.contact)}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{deal.contact}</div>
                <div className="text-xs text-muted">{deal.contactRole} · {deal.company}</div>
              </div>
              <div className="flex gap-1.5">
                <button className="w-8 h-8 rounded-lg bg-panel flex items-center justify-center text-muted hover:text-brass hover:bg-brass-soft transition-all">
                  <Mail className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
                <button className="w-8 h-8 rounded-lg bg-panel flex items-center justify-center text-muted hover:text-signal hover:bg-signal/[0.08] transition-all">
                  <Phone className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
              </div>
            </div>
          </div>

          {/* Next action */}
          <div className="rounded-xl bg-brass-soft/40 border border-brass/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-3.5 h-3.5 text-brass" strokeWidth={2} />
              <span className="text-[10px] uppercase tracking-[0.14em] text-brass font-medium">Next Action</span>
            </div>
            <div className="text-sm">{deal.nextAction}</div>
            <div className="text-xs text-muted mt-1">{deal.nextActionDate} · {deal.lastActivity}</div>
          </div>

          {/* Activity timeline */}
          {activities.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted mb-3">Recent Activity</div>
              <div className="space-y-3">
                {activities.map(a => {
                  const Icon = ACTIVITY_ICON[a.type];
                  return (
                    <div key={a.id} className="flex gap-3">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", ACTIVITY_TONE[a.type])}>
                        <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm leading-snug">{a.summary}</div>
                        <div className="text-[10px] text-muted mt-0.5 flex items-center gap-1.5">
                          {a.time}
                          {a.aiDrafted && (
                            <span className="inline-flex items-center gap-1 text-brass">
                              <Sparkles className="w-2.5 h-2.5" strokeWidth={2} />
                              AI drafted
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-5 border-t border-line shrink-0">
          <button className="flex-1 py-3 rounded-xl text-sm font-medium bg-panel-2 hover:bg-white/[0.06] text-muted hover:text-ink-text transition-all flex items-center justify-center gap-2">
            <Mail className="w-4 h-4" strokeWidth={1.75} />
            Draft outreach
          </button>
          <button className="flex-1 py-3 rounded-xl text-sm font-medium bg-brass text-[#1a140a] hover:bg-brass/90 transition-all flex items-center justify-center gap-2">
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
            Advance stage
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Activity Feed ──────────────────────────────────────────────────────────────

function ActivityFeed({ activities }: { activities: OutreachItem[] }) {
  return (
    <Panel className="overflow-hidden">
      <div className="px-6 py-5 flex items-center justify-between border-b border-line">
        <h3 className="font-display text-xl">Recent Activity</h3>
        <span className="text-xs font-mono text-muted">{activities.length} entries</span>
      </div>
      <div className="divide-y divide-line">
        {activities.map(a => {
          const Icon = ACTIVITY_ICON[a.type];
          return (
            <div key={a.id} className="flex items-start gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", ACTIVITY_TONE[a.type])}>
                <Icon className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{a.company}</span>
                  <span className="text-xs text-muted">· {a.contact}</span>
                  {a.aiDrafted && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-brass bg-brass-soft px-2 py-0.5 rounded-full">
                      <Sparkles className="w-2.5 h-2.5" strokeWidth={2} />
                      Vela drafted
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted mt-0.5 leading-relaxed">{a.summary}</div>
              </div>
              <span className="text-[10px] text-muted whitespace-nowrap shrink-0 pt-1">{a.time}</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ── Vela Insights ──────────────────────────────────────────────────────────────

function InsightsPanel({ insights }: { insights: VelaInsight[] }) {
  const typeConfig: Record<VelaInsight["type"], { icon: string; tone: string }> = {
    opportunity: { icon: "↗", tone: "text-signal" },
    risk:        { icon: "⚠", tone: "text-brass" },
    action:      { icon: "→", tone: "text-sky-400" },
  };

  return (
    <Panel className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brass" strokeWidth={1.75} />
          <h3 className="font-display text-xl">Vela&apos;s Insights</h3>
        </div>
        <span className="w-1.5 h-1.5 rounded-full bg-signal shadow-[0_0_0_4px_rgba(127,224,200,0.12)]" />
      </div>
      <ul className="space-y-4">
        {insights.map(insight => {
          const conf = typeConfig[insight.type];
          return (
            <li key={insight.id} className="flex gap-3 group">
              <span className={cn("text-sm mt-0.5 shrink-0 font-medium", conf.tone)}>{conf.icon}</span>
              <span className="text-sm text-muted leading-relaxed group-hover:text-ink-text transition-colors">{insight.text}</span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// ── Stage Filter Bar ───────────────────────────────────────────────────────────

type ViewMode = "pipeline" | "list";

function FilterBar({
  view,
  setView,
  stageFilter,
  setStageFilter,
}: {
  view: ViewMode;
  setView: (v: ViewMode) => void;
  stageFilter: DealStage | "all";
  setStageFilter: (s: DealStage | "all") => void;
}) {
  const allStages: (DealStage | "all")[] = ["all", "lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"];

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
      {/* Stage pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {allStages.map(s => {
          const label = s === "all" ? "All Deals" : STAGE_CONFIG[s].label;
          return (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                stageFilter === s
                  ? "bg-brass text-[#1a140a]"
                  : "bg-panel-2 text-muted hover:text-ink-text"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-1 bg-panel-2 rounded-xl p-1">
        <button
          onClick={() => setView("pipeline")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            view === "pipeline" ? "bg-panel text-ink-text shadow-sm" : "text-muted hover:text-ink-text"
          )}
        >
          Pipeline
        </button>
        <button
          onClick={() => setView("list")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            view === "list" ? "bg-panel text-ink-text shadow-sm" : "text-muted hover:text-ink-text"
          )}
        >
          List
        </button>
      </div>
    </div>
  );
}

// ── List View ──────────────────────────────────────────────────────────────────

function DealListView({ deals, onViewDeal }: { deals: Deal[]; onViewDeal: (deal: Deal) => void }) {
  return (
    <Panel className="overflow-hidden">
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-line">
              <th className="text-left text-[10px] uppercase tracking-[0.14em] text-muted font-medium px-6 py-3">Company</th>
              <th className="text-left text-[10px] uppercase tracking-[0.14em] text-muted font-medium px-4 py-3">Contact</th>
              <th className="text-left text-[10px] uppercase tracking-[0.14em] text-muted font-medium px-4 py-3">Stage</th>
              <th className="text-right text-[10px] uppercase tracking-[0.14em] text-muted font-medium px-4 py-3">Value</th>
              <th className="text-right text-[10px] uppercase tracking-[0.14em] text-muted font-medium px-4 py-3">Prob.</th>
              <th className="text-left text-[10px] uppercase tracking-[0.14em] text-muted font-medium px-4 py-3">Next Action</th>
              <th className="text-right text-[10px] uppercase tracking-[0.14em] text-muted font-medium px-6 py-3">Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {deals.map(deal => {
              const stageConf = STAGE_CONFIG[deal.stage];
              return (
                <tr
                  key={deal.id}
                  onClick={() => onViewDeal(deal)}
                  className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-xs font-display font-semibold shrink-0", avatarColor(deal.id))}>
                        {initials(deal.company)}
                      </div>
                      <span className="text-sm font-medium group-hover:text-brass transition-colors">{deal.company}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm">{deal.contact}</div>
                    <div className="text-[10px] text-muted">{deal.contactRole}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn("text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap", stageConf.color)}>
                      {stageConf.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="font-display text-sm">{formatCurrency(deal.value)}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={cn("font-mono text-xs", deal.probability >= 70 ? "text-signal" : deal.probability >= 40 ? "text-brass" : "text-muted")}>
                      {deal.probability}%
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-muted truncate max-w-[200px] block">{deal.nextAction}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn("text-xs whitespace-nowrap", deal.nextActionDate === "Today" ? "text-brass" : "text-muted")}>
                      {deal.nextActionDate}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function BizDevPage() {
  const [deals] = useState<Deal[]>(DEALS);
  const [view, setView] = useState<ViewMode>("pipeline");
  const [stageFilter, setStageFilter] = useState<DealStage | "all">("all");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const filteredDeals = useMemo(() => {
    if (stageFilter === "all") return deals;
    return deals.filter(d => d.stage === stageFilter);
  }, [deals, stageFilter]);

  const activeDeals = deals.filter(d => d.stage !== "closed_won" && d.stage !== "closed_lost");
  const urgentCount = activeDeals.filter(d => d.nextActionDate === "Today" || d.nextActionDate === "Tomorrow").length;

  return (
    <>
      <Topbar
        eyebrow="Direction"
        title="Business Development"
        statusText={`${urgentCount} actions due soon`}
      />

      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8 space-y-8">
        {/* Hero banner */}
        <Panel className="p-8 relative overflow-hidden">
          <svg
            className="absolute -right-12 -top-12 opacity-[0.06] animate-orbit-drift"
            width="280"
            height="280"
            viewBox="0 0 280 280"
          >
            <circle cx="140" cy="140" r="130" fill="none" stroke="#C9A66B" strokeWidth="1" />
            <circle cx="140" cy="140" r="90" fill="none" stroke="#7FE0C8" strokeWidth="0.75" />
            <circle cx="140" cy="10" r="4" fill="#C9A66B" />
            <circle cx="230" cy="140" r="3" fill="#7FE0C8" />
            <circle cx="50" cy="100" r="2.5" fill="#C9A66B" />
          </svg>

          <div className="relative max-w-2xl">
            <div className="text-[11px] uppercase tracking-[0.18em] mb-3 text-brass">
              Pipeline Overview
            </div>
            <h2 className="font-display text-3xl lg:text-4xl leading-tight">
              {urgentCount} deals need attention today. Pipeline is trending strong.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Meridian Health is ready for revised contract terms, and Atlas Financial
              hasn&apos;t opened your proposal yet. Vela has drafted follow-ups for both.
            </p>
            <div className="mt-6 flex gap-3">
              <button className="px-4 py-2 rounded-lg text-sm font-medium bg-brass text-[#1a140a] hover:bg-brass/90 transition-all">
                Review actions
              </button>
              <button className="px-4 py-2 rounded-lg text-sm font-medium bg-panel-2 hover:bg-white/[0.06] transition-all">
                View AI drafts
              </button>
            </div>
          </div>
        </Panel>

        {/* Metrics row */}
        <PipelineMetrics deals={deals} />

        {/* Filter bar */}
        <FilterBar view={view} setView={setView} stageFilter={stageFilter} setStageFilter={setStageFilter} />

        {/* Pipeline / List view */}
        {view === "pipeline" && stageFilter === "all" ? (
          <PipelineBoard deals={filteredDeals} onViewDeal={setSelectedDeal} />
        ) : (
          <DealListView deals={filteredDeals} onViewDeal={setSelectedDeal} />
        )}

        {/* Bottom section: Activity + Insights */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ActivityFeed activities={RECENT_ACTIVITY} />
          </div>
          <div>
            <InsightsPanel insights={VELA_INSIGHTS} />
          </div>
        </section>
      </main>

      {/* Deal detail drawer */}
      {selectedDeal && (
        <DealDrawer deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
      )}
    </>
  );
}
