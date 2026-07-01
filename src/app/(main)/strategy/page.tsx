"use client";

import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";
import { TrendingUp, Circle, CheckCircle2, AlertCircle, ChevronRight, Zap } from "lucide-react";

// ── Mock data (replace with Prisma queries once OKR model is added) ────────

const strategicBets = [
  {
    id: "sb1",
    title: "Own the solo-founder segment before Series A players enter",
    horizon: "6 months",
    status: "on-track" as const,
    signal: "Waitlist +340% MoM. No funded competitor in this exact niche yet.",
  },
  {
    id: "sb2",
    title: "Make Vyris the connective tissue between Calendar, Gmail, and Projects",
    horizon: "3 months",
    status: "at-risk" as const,
    signal: "Gmail integration live. Calendar sync missing edge cases. Projects not yet surfaced in briefings.",
  },
  {
    id: "sb3",
    title: "Establish AI-generated briefings as the daily habit loop",
    horizon: "2 months",
    status: "on-track" as const,
    signal: "Dashboard briefing panel shipped. Next: personalization by role.",
  },
];

const okrs = [
  {
    id: "okr1",
    objective: "Reach 500 active users by end of quarter",
    progress: 68,
    keyResults: [
      { label: "Waitlist signups", current: 1240, target: 1500, unit: "" },
      { label: "Activated users", current: 342, target: 500, unit: "" },
      { label: "7-day retention", current: 61, target: 75, unit: "%" },
    ],
  },
  {
    id: "okr2",
    objective: "Ship the core AI loop end-to-end",
    progress: 45,
    keyResults: [
      { label: "Pages with real content (not placeholder)", current: 9, target: 18, unit: "" },
      { label: "Vyris-generated actions per session", current: 1.2, target: 4, unit: "" },
      { label: "Briefing open rate", current: 55, target: 80, unit: "%" },
    ],
  },
  {
    id: "okr3",
    objective: "Validate pricing before public launch",
    progress: 20,
    keyResults: [
      { label: "Paid beta users", current: 4, target: 20, unit: "" },
      { label: "NPS from paid cohort", current: 0, target: 40, unit: "" },
      { label: "Churn in first 30 days", current: 0, target: 10, unit: "%" },
    ],
  },
];

const decisions = [
  {
    id: "d1",
    title: "Keep Strategy as standalone page, not merged into Dashboard",
    date: "Jun 12",
    rationale: "Dashboard is operational (daily). Strategy is directional (weekly). Different cadence = different page.",
    status: "made" as const,
  },
  {
    id: "d2",
    title: "Store documents in Postgres (Bytes) rather than S3",
    date: "Jun 8",
    rationale: "Simplicity wins at this stage. Migrate to S3 when file volume justifies the ops overhead.",
    status: "made" as const,
  },
  {
    id: "d3",
    title: "Whether to add a public API before or after GA",
    date: "—",
    rationale: "Blocking question: does the ICP need integrations at launch or can that wait 6 months?",
    status: "open" as const,
  },
];

const driftSignals = [
  { label: "Tasks created this week", value: 14, note: "3 linked to OKRs. 11 not." },
  { label: "Strategic bets with no active task", value: 1, note: "Bet #2 has no task assigned." },
  { label: "Decisions pending > 14 days", value: 1, note: "Public API question unresolved." },
];

// ── Sub-components ─────────────────────────────────────────────────────────

const statusConfig = {
  "on-track": { label: "On track", color: "text-signal", bg: "bg-signal/10", icon: CheckCircle2 },
  "at-risk": { label: "At risk", color: "text-brass", bg: "bg-brass-soft", icon: AlertCircle },
  "off-track": { label: "Off track", color: "text-red-400", bg: "bg-red-500/10", icon: AlertCircle },
};

function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1 rounded-full bg-panel-2 overflow-hidden", className)}>
      <div
        className="h-full rounded-full bg-brass transition-all duration-700"
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function KRRow({ label, current, target, unit }: { label: string; current: number; target: number; unit: string }) {
  const pct = Math.min((current / target) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="text-xs text-muted">{label}</span>
        <span className="font-mono text-xs text-ink-text/70">
          {current}{unit} <span className="text-muted">/ {target}{unit}</span>
        </span>
      </div>
      <ProgressBar value={pct} />
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function StrategyPage() {
  return (
    <>
      <Topbar
        eyebrow="Direction"
        title="Strategic Planning"
        statusText="3 OKRs tracked · 1 open decision"
      />

      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8 space-y-8">

        {/* ── Drift alert bar ── */}
        <div className="flex items-start gap-4 px-5 py-4 rounded-xl bg-brass-soft border border-brass/20">
          <Zap className="w-4 h-4 text-brass mt-0.5 shrink-0" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-medium text-brass">Strategy drift detected</p>
            <p className="text-xs text-muted mt-0.5">
              11 of 14 tasks this week aren't tied to any OKR. Bet #2 has no active work assigned.
            </p>
          </div>
          <button className="ml-auto text-xs text-brass underline underline-offset-2 whitespace-nowrap shrink-0">
            Review
          </button>
        </div>

        {/* ── OKRs ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl">Objectives & Key Results</h2>
            <span className="text-xs font-mono text-muted">Q3 · Jul – Sep</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {okrs.map((okr) => (
              <Panel key={okr.id} className="p-6 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] uppercase tracking-[0.14em] text-muted">Objective</span>
                    <span className="font-mono text-xs text-brass">{okr.progress}%</span>
                  </div>
                  <p className="text-sm font-medium text-ink-text leading-snug">{okr.objective}</p>
                  <ProgressBar value={okr.progress} className="mt-3" />
                </div>
                <div className="space-y-3 pt-1 border-t border-line">
                  {okr.keyResults.map((kr) => (
                    <KRRow key={kr.label} {...kr} />
                  ))}
                </div>
              </Panel>
            ))}
          </div>
        </section>

        {/* ── Strategic bets + Drift signals ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Bets — 2/3 width */}
          <Panel className="lg:col-span-2 overflow-hidden">
            <div className="px-6 py-5 flex items-center justify-between border-b border-line">
              <h3 className="font-display text-xl">Strategic Bets</h3>
              <span className="text-xs font-mono text-muted">{strategicBets.length} active</span>
            </div>
            <div className="divide-y divide-line">
              {strategicBets.map((bet, i) => {
                const cfg = statusConfig[bet.status];
                const StatusIcon = cfg.icon;
                return (
                  <div key={bet.id} className="px-6 py-5 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-start gap-4">
                      <span className="font-mono text-xs text-muted mt-0.5 w-4 shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-ink-text">{bet.title}</p>
                        </div>
                        <p className="text-xs text-muted mt-1.5 leading-relaxed">{bet.signal}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded-full", cfg.bg, cfg.color)}>
                          <StatusIcon className="w-3 h-3" strokeWidth={2} />
                          {cfg.label}
                        </span>
                        <span className="text-[11px] text-muted font-mono">{bet.horizon}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Drift signals — 1/3 width */}
          <div className="space-y-4">
            <Panel className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg">Alignment Signals</h3>
                <TrendingUp className="w-4 h-4 text-muted" strokeWidth={1.5} />
              </div>
              <div className="space-y-4">
                {driftSignals.map((s) => (
                  <div key={s.label} className="space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-muted">{s.label}</span>
                      <span className="font-mono text-sm text-ink-text">{s.value}</span>
                    </div>
                    <p className="text-[11px] text-muted leading-relaxed">{s.note}</p>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Weekly cadence reminder */}
            <Panel className="p-6 bg-brass-soft border border-brass/15">
              <div className="text-[11px] uppercase tracking-[0.14em] text-brass mb-2">Weekly Review</div>
              <p className="text-xs text-muted leading-relaxed">
                Strategy is only as good as the cadence around it. Set a recurring 30-min block to update bets and close open decisions.
              </p>
              <button className="mt-4 flex items-center gap-1 text-xs text-brass font-medium">
                Schedule on Calendar <ChevronRight className="w-3 h-3" />
              </button>
            </Panel>
          </div>
        </section>

        {/* ── Decisions log ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl">Decision Log</h2>
            <button className="text-xs text-brass font-medium flex items-center gap-1">
              Log a decision <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <Panel className="overflow-hidden">
            <div className="divide-y divide-line">
              {decisions.map((d) => (
                <div key={d.id} className="px-6 py-5 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 shrink-0">
                      {d.status === "made" ? (
                        <CheckCircle2 className="w-4 h-4 text-signal" strokeWidth={1.5} />
                      ) : (
                        <Circle className="w-4 h-4 text-brass" strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-text">{d.title}</p>
                      <p className="text-xs text-muted mt-1.5 leading-relaxed">{d.rationale}</p>
                    </div>
                    <span className="font-mono text-xs text-muted shrink-0">{d.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </section>

      </main>
    </>
  );
}