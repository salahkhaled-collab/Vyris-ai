"use client";

import { useState, useMemo } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";
import {
  Clock, ArrowRight, X, Mail, Phone, Calendar,
  Sparkles, Target, Zap,
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
  { id: "deal1", company: "Meridian Health Systems", contact: "Rachel Torres", contactRole: "VP of Partnerships", value: 480000, stage: "negotiation", priority: "high", probability: 75, nextAction: "Send revised contract terms", nextActionDate: "Today", lastActivity: "Call 2 hours ago", source: "Referral" },
  { id: "deal2", company: "Atlas Financial Group", contact: "James Liu", contactRole: "Head of Strategy", value: 320000, stage: "proposal", priority: "high", probability: 60, nextAction: "Follow up on proposal review", nextActionDate: "Tomorrow", lastActivity: "Email yesterday", source: "Inbound" },
  { id: "deal3", company: "Vertex Technologies", contact: "Samira Patel", contactRole: "CTO", value: 750000, stage: "qualified", priority: "medium", probability: 40, nextAction: "Schedule technical deep-dive", nextActionDate: "This week", lastActivity: "Meeting 3 days ago", source: "Conference" },
  { id: "deal4", company: "Northwind Logistics", contact: "Erik Johansson", contactRole: "COO", value: 195000, stage: "negotiation", priority: "medium", probability: 80, nextAction: "Legal review of final terms", nextActionDate: "Wed", lastActivity: "Email today", source: "Outbound" },
  { id: "deal5", company: "Solaris Energy", contact: "Mei Zhang", contactRole: "Director of Innovation", value: 560000, stage: "lead", priority: "medium", probability: 20, nextAction: "Initial discovery call", nextActionDate: "Thu", lastActivity: "LinkedIn DM", source: "Outbound" },
  { id: "deal6", company: "Cascade Media", contact: "Olivia Hart", contactRole: "CMO", value: 240000, stage: "proposal", priority: "low", probability: 45, nextAction: "Customize demo deck", nextActionDate: "Next week", lastActivity: "Email 4 days ago", source: "Inbound" },
  { id: "deal7", company: "Ironclad Industries", contact: "Marcus Webb", contactRole: "CEO", value: 1200000, stage: "lead", priority: "high", probability: 15, nextAction: "Research and qualify", nextActionDate: "This week", lastActivity: "Warm intro received", source: "Referral" },
  { id: "deal8", company: "Pinnacle Advisory", contact: "Nadia Kowalski", contactRole: "Managing Partner", value: 380000, stage: "closed_won", priority: "high", probability: 100, nextAction: "Onboarding kickoff", nextActionDate: "Mon", lastActivity: "Contract signed", source: "Referral" },
  { id: "deal9", company: "Brightpath Education", contact: "Daniel Brooks", contactRole: "Head of Partnerships", value: 165000, stage: "closed_lost", priority: "low", probability: 0, nextAction: "Re-engage in Q4", nextActionDate: "Sep", lastActivity: "Declined — budget freeze", source: "Inbound" },
  { id: "deal10", company: "AeroVault", contact: "Liam Chen", contactRole: "VP Product", value: 420000, stage: "qualified", priority: "high", probability: 50, nextAction: "Send case study deck", nextActionDate: "Tomorrow", lastActivity: "Discovery call today", source: "Conference" },
];

const RECENT_ACTIVITY: OutreachItem[] = [
  { id: "a1", type: "call",    company: "Meridian Health",    contact: "Rachel Torres",  summary: "Discussed revised pricing — aligned on scope, want adjusted payment terms", time: "2 hr ago" },
  { id: "a2", type: "email",   company: "Atlas Financial",    contact: "James Liu",      summary: "Vela drafted follow-up on proposal. Awaiting your review.", time: "4 hr ago", aiDrafted: true },
  { id: "a3", type: "meeting", company: "AeroVault",          contact: "Liam Chen",      summary: "45-min discovery call — strong product fit, budget confirmed for Q3", time: "Today, 10:00" },
  { id: "a4", type: "email",   company: "Northwind Logistics", contact: "Erik Johansson", summary: "Sent final contract draft with updated SLA terms", time: "Today, 09:15" },
  { id: "a5", type: "note",    company: "Ironclad Industries", contact: "Marcus Webb",    summary: "Warm intro from Sarah K. — large enterprise, long sales cycle expected", time: "Yesterday" },
  { id: "a6", type: "email",   company: "Cascade Media",      contact: "Olivia Hart",    summary: "Vela prepared personalized demo deck based on their media verticals", time: "Yesterday", aiDrafted: true },
];

const VELA_INSIGHTS: VelaInsight[] = [
  { id: "i1", text: "Meridian Health deal is 2× more likely to close if contract revisions are sent today — their board meets Friday.", type: "action" },
  { id: "i2", text: "Atlas Financial hasn't opened the proposal in 48 hours. Suggest a brief check-in call.", type: "risk" },
  { id: "i3", text: "Ironclad Industries matches your ideal customer profile — similar to Pinnacle Advisory (closed $380K last month).", type: "opportunity" },
  { id: "i4", text: "Pipeline velocity improved 18% this month. On track to exceed Q3 target by $240K.", type: "opportunity" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<DealStage, { label: string; color: string; dotColor: string }> = {
  lead:        { label: "Lead",        color: "text-muted bg-panel-2",                dotColor: "bg-white/20" },
  qualified:   { label: "Qualified",   color: "text-violet-400 bg-violet-500/[0.10]", dotColor: "bg-violet-400" },
  proposal:    { label: "Proposal",    color: "text-sky-400 bg-sky-500/[0.10]",       dotColor: "bg-sky-400" },
  negotiation: { label: "Negotiation", color: "text-brass bg-brass-soft",             dotColor: "bg-brass" },
  closed_won:  { label: "Closed Won",  color: "text-signal bg-signal/[0.10]",         dotColor: "bg-signal" },
  closed_lost: { label: "Closed Lost", color: "text-red-400 bg-red-500/[0.10]",       dotColor: "bg-red-400" },
};

const ACTIVITY_ICON: Record<ActivityType, typeof Mail> = {
  email: Mail, call: Phone, meeting: Calendar, note: Target,
};

const ACTIVITY_TONE: Record<ActivityType, string> = {
  email:   "bg-sky-500/[0.10] text-sky-400",
  call:    "bg-signal/[0.10] text-signal",
  meeting: "bg-violet-500/[0.10] text-violet-400",
  note:    "bg-amber-500/[0.10] text-amber-400",
};

function fmt(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── Deal Card — stripped down ──────────────────────────────────────────────────

function DealCard({ deal, onView }: { deal: Deal; onView: (d: Deal) => void }) {
  const isUrgent = deal.nextActionDate === "Today";

  return (
    <button
      onClick={() => onView(deal)}
      className="w-full text-left bg-panel border border-line rounded-xl p-4 hover:border-white/[0.10] transition-colors group"
    >
      {/* Company + value */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="text-sm font-medium leading-tight">{deal.company}</div>
          <div className="text-xs text-muted mt-0.5">{deal.contact}</div>
        </div>
        <span className="font-display text-base shrink-0">{fmt(deal.value)}</span>
      </div>

      {/* Probability + priority — single line, no bar */}
      <div className="flex items-center justify-between mb-3">
        <span className={cn(
          "font-mono text-xs",
          deal.probability >= 70 ? "text-signal" : deal.probability >= 40 ? "text-brass" : "text-muted"
        )}>
          {deal.probability}%
        </span>
        <span className={cn(
          "text-[10px] px-2 py-0.5 rounded-full",
          deal.priority === "high" ? "text-brass bg-brass-soft" : "text-muted bg-panel-2"
        )}>
          {deal.priority}
        </span>
      </div>

      {/* Next action */}
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Clock className="w-3 h-3 shrink-0" strokeWidth={2} />
        <span className="truncate">{deal.nextAction}</span>
        <span className={cn("shrink-0 ml-auto", isUrgent ? "text-brass" : "text-muted/60")}>
          {deal.nextActionDate}
        </span>
      </div>
    </button>
  );
}

// ── Kanban board ───────────────────────────────────────────────────────────────

const PIPELINE_STAGES: DealStage[] = ["lead", "qualified", "proposal", "negotiation", "closed_won"];

function PipelineBoard({ deals, onView }: { deals: Deal[]; onView: (d: Deal) => void }) {
  return (
    <Panel className="overflow-hidden">
      <div className="px-6 py-5 flex items-center justify-between border-b border-line">
        <h3 className="font-display text-xl">Deal Pipeline</h3>
        <span className="text-xs font-mono text-muted">
          {deals.filter(d => d.stage !== "closed_lost").length} deals
        </span>
      </div>
      <div className="overflow-x-auto scroll-thin">
        <div className="flex min-w-[900px]">
          {PIPELINE_STAGES.map((stage, idx) => {
            const conf = STAGE_CONFIG[stage];
            const stageDeals = deals.filter(d => d.stage === stage);
            return (
              <div
                key={stage}
                className={cn("flex-1 min-w-[180px] p-4", idx < PIPELINE_STAGES.length - 1 && "border-r border-line")}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("w-1.5 h-1.5 rounded-full", conf.dotColor)} />
                  <span className="text-xs font-medium">{conf.label}</span>
                  <span className="text-[10px] font-mono text-muted ml-auto">{stageDeals.length}</span>
                </div>
                <div className="text-[10px] text-muted mb-4 pl-3.5">
                  {fmt(stageDeals.reduce((s, d) => s + d.value, 0))}
                </div>
                <div className="space-y-3">
                  {stageDeals.map(deal => (
                    <DealCard key={deal.id} deal={deal} onView={onView} />
                  ))}
                  {stageDeals.length === 0 && (
                    <div className="py-8 text-center text-xs text-muted/40">No deals</div>
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

// ── List view ──────────────────────────────────────────────────────────────────

function DealListView({ deals, onView }: { deals: Deal[]; onView: (d: Deal) => void }) {
  return (
    <Panel className="overflow-hidden">
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-line">
              {["Company", "Stage", "Value", "Prob.", "Next Action", "Due"].map((h, i) => (
                <th key={h} className={cn(
                  "text-[10px] uppercase tracking-[0.14em] text-muted font-medium py-3",
                  i === 0 ? "text-left px-6" : i >= 4 ? "text-left px-4" : "text-right px-4"
                )}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {deals.map(deal => {
              const conf = STAGE_CONFIG[deal.stage];
              return (
                <tr key={deal.id} onClick={() => onView(deal)} className="hover:bg-white/[0.02] cursor-pointer transition-colors group">
                  <td className="px-6 py-3">
                    <div className="text-sm font-medium group-hover:text-brass transition-colors">{deal.company}</div>
                    <div className="text-[10px] text-muted">{deal.contact}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full", conf.color)}>{conf.label}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-display text-sm">{fmt(deal.value)}</td>
                  <td className={cn("px-4 py-3 text-right font-mono text-xs", deal.probability >= 70 ? "text-signal" : deal.probability >= 40 ? "text-brass" : "text-muted")}>
                    {deal.probability}%
                  </td>
                  <td className="px-4 py-3 text-sm text-muted truncate max-w-[180px]">{deal.nextAction}</td>
                  <td className={cn("px-4 py-3 text-xs whitespace-nowrap", deal.nextActionDate === "Today" ? "text-brass" : "text-muted")}>
                    {deal.nextActionDate}
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

// ── Deal drawer ────────────────────────────────────────────────────────────────

function DealDrawer({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const conf = STAGE_CONFIG[deal.stage];
  const activities = RECENT_ACTIVITY.filter(a => a.company.startsWith(deal.company.split(" ")[0]));

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-panel border-l border-line shadow-2xl flex flex-col h-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-line shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted">Deal Details</div>
            <h2 className="font-display text-xl mt-1">{deal.company}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-panel-2 text-muted transition-all">
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin px-6 py-6 space-y-5">
          {/* Value + probability */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-panel-2 border border-line p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1">Value</div>
              <div className="font-display text-2xl">{fmt(deal.value)}</div>
            </div>
            <div className="rounded-xl bg-panel-2 border border-line p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1">Probability</div>
              <div className="font-display text-2xl">{deal.probability}%</div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-xs px-3 py-1 rounded-full", conf.color)}>{conf.label}</span>
            <span className="text-xs px-3 py-1 rounded-full bg-panel-2 text-muted">{deal.priority} priority</span>
            <span className="text-xs px-3 py-1 rounded-full bg-panel-2 text-muted">{deal.source}</span>
          </div>

          {/* Contact */}
          <div className="rounded-xl bg-panel-2 border border-line p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted mb-3">Contact</div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-panel-2 border border-line flex items-center justify-center text-xs font-display text-muted">
                {initials(deal.contact)}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{deal.contact}</div>
                <div className="text-xs text-muted">{deal.contactRole}</div>
              </div>
              <div className="flex gap-1.5">
                <button className="w-8 h-8 rounded-lg bg-panel border border-line flex items-center justify-center text-muted hover:text-brass transition-colors">
                  <Mail className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
                <button className="w-8 h-8 rounded-lg bg-panel border border-line flex items-center justify-center text-muted hover:text-signal transition-colors">
                  <Phone className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
              </div>
            </div>
          </div>

          {/* Next action */}
          <div className="rounded-xl bg-brass-soft border border-brass/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-3.5 h-3.5 text-brass" strokeWidth={2} />
              <span className="text-[10px] uppercase tracking-[0.14em] text-brass font-medium">Next Action</span>
            </div>
            <div className="text-sm">{deal.nextAction}</div>
            <div className="text-xs text-muted mt-1">{deal.nextActionDate} · {deal.lastActivity}</div>
          </div>

          {/* Activity */}
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
                            <span className="text-brass flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" strokeWidth={2} />AI drafted
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

        <div className="flex gap-3 px-6 py-5 border-t border-line shrink-0">
          <button className="flex-1 py-3 rounded-xl text-sm font-medium bg-panel-2 text-muted hover:text-ink-text transition-colors flex items-center justify-center gap-2">
            <Mail className="w-4 h-4" strokeWidth={1.75} />
            Draft outreach
          </button>
          <button className="flex-1 py-3 rounded-xl text-sm font-medium bg-brass text-[#1a140a] hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
            Advance stage
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Activity feed — max 3 items ────────────────────────────────────────────────

function ActivityFeed({ activities }: { activities: OutreachItem[] }) {
  const shown = activities.slice(0, 3);
  return (
    <Panel className="overflow-hidden">
      <div className="px-6 py-5 flex items-center justify-between border-b border-line">
        <h3 className="font-display text-xl">Recent Activity</h3>
        <span className="text-xs font-mono text-muted">{activities.length} entries</span>
      </div>
      <div className="divide-y divide-line">
        {shown.map(a => {
          const Icon = ACTIVITY_ICON[a.type];
          return (
            <div key={a.id} className="flex items-start gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", ACTIVITY_TONE[a.type])}>
                <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
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

// ── Vela insights ──────────────────────────────────────────────────────────────

function InsightsPanel({ insights }: { insights: VelaInsight[] }) {
  const tone: Record<VelaInsight["type"], string> = {
    opportunity: "text-signal",
    risk:        "text-brass",
    action:      "text-muted",
  };
  const icon: Record<VelaInsight["type"], string> = {
    opportunity: "↗", risk: "▲", action: "→",
  };

  return (
    <Panel className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-muted" strokeWidth={1.75} />
          <h3 className="font-display text-xl">Vela&apos;s Insights</h3>
        </div>
        <span className="w-1.5 h-1.5 rounded-full bg-signal" />
      </div>
      <ul className="space-y-4">
        {insights.map(insight => (
          <li key={insight.id} className="flex gap-3">
            <span className={cn("text-sm shrink-0 mt-0.5", tone[insight.type])}>{icon[insight.type]}</span>
            <span className="text-sm text-muted leading-relaxed">{insight.text}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ── Filter bar ─────────────────────────────────────────────────────────────────

type ViewMode = "pipeline" | "list";

function FilterBar({ view, setView, stageFilter, setStageFilter }: {
  view: ViewMode; setView: (v: ViewMode) => void;
  stageFilter: DealStage | "all"; setStageFilter: (s: DealStage | "all") => void;
}) {
  const stages: (DealStage | "all")[] = ["all", "lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"];
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
      <div className="flex items-center gap-1.5 flex-wrap">
        {stages.map(s => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
              stageFilter === s ? "bg-brass text-[#1a140a]" : "bg-panel-2 text-muted hover:text-ink-text"
            )}
          >
            {s === "all" ? "All Deals" : STAGE_CONFIG[s].label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1 bg-panel-2 rounded-xl p-1">
        {(["pipeline", "list"] as ViewMode[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize",
              view === v ? "bg-panel text-ink-text" : "text-muted hover:text-ink-text"
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function BizDevPage() {
  const [view, setView] = useState<ViewMode>("pipeline");
  const [stageFilter, setStageFilter] = useState<DealStage | "all">("all");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const filteredDeals = useMemo(() => (
    stageFilter === "all" ? DEALS : DEALS.filter(d => d.stage === stageFilter)
  ), [stageFilter]);

  const urgentCount = DEALS.filter(d =>
    d.stage !== "closed_won" && d.stage !== "closed_lost" &&
    (d.nextActionDate === "Today" || d.nextActionDate === "Tomorrow")
  ).length;

  return (
    <>
      <Topbar eyebrow="Direction" title="Business Development" statusText={`${urgentCount} actions due soon`} />

      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8 space-y-6">

        {/* Hero */}
        <Panel className="p-8">
          <div className="text-[11px] uppercase tracking-[0.18em] mb-3 text-brass">Pipeline Overview</div>
          <h2 className="font-display text-3xl lg:text-4xl leading-tight">
            {urgentCount} deals need attention today.{" "}
            <span className="text-muted">Pipeline is trending strong.</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted max-w-xl">
            Meridian Health is ready for revised contract terms, and Atlas Financial hasn&apos;t opened your proposal yet. Vela has drafted follow-ups for both.
          </p>
          <div className="mt-6 flex gap-3">
            <button className="px-4 py-2 rounded-lg text-sm font-medium bg-brass text-[#1a140a] hover:opacity-90 transition-opacity">
              Review actions
            </button>
            <button className="px-4 py-2 rounded-lg text-sm font-medium bg-panel-2 text-muted hover:text-ink-text transition-colors">
              View AI drafts
            </button>
          </div>
        </Panel>

        {/* Filter + pipeline/list */}
        <FilterBar view={view} setView={setView} stageFilter={stageFilter} setStageFilter={setStageFilter} />

        {view === "pipeline" && stageFilter === "all"
          ? <PipelineBoard deals={filteredDeals} onView={setSelectedDeal} />
          : <DealListView deals={filteredDeals} onView={setSelectedDeal} />
        }

        {/* Activity + Insights */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ActivityFeed activities={RECENT_ACTIVITY} />
          </div>
          <InsightsPanel insights={VELA_INSIGHTS} />
        </section>
      </main>

      {selectedDeal && <DealDrawer deal={selectedDeal} onClose={() => setSelectedDeal(null)} />}
    </>
  );
}