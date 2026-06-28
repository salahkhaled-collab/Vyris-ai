"use client";

import { useMemo } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { priorityLedger, velaActivity } from "@/lib/mock-data";
import { SchedulePanel } from "@/components/dashboard/SchedulePanel";
import { useUser } from "@/lib/user-context";
import { sortLedgerForRole } from "@/lib/role-priority";
import { cn } from "@/lib/utils";

const urgencyStyles = {
  critical: "bg-signal/[0.12] text-signal",
  high: "bg-brass-soft text-brass",
  normal: "bg-panel-2 text-muted",
};

export default function DashboardPage() {
  const { role } = useUser();

  const sortedLedger = useMemo(
    () => sortLedgerForRole(priorityLedger, role),
    [role]
  );

  return (
    <>
      <Topbar
        eyebrow="Sunday, 14 June"
        title="Command Center"
        statusText="Vela is monitoring 6 threads"
      />

      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8 space-y-6">

        {/* ── Hero Briefing ── */}
        <Panel className="p-8 relative overflow-hidden">
          {/* Ambient decoration — kept very subtle */}
          <svg
            className="absolute -right-16 -top-16 opacity-[0.05] animate-orbit-drift pointer-events-none"
            width="280"
            height="280"
            viewBox="0 0 320 320"
          >
            <circle cx="160" cy="160" r="150" fill="none" stroke="#C9A66B" strokeWidth="1" />
            <circle cx="160" cy="160" r="110" fill="none" stroke="#C9A66B" strokeWidth="1" />
            <circle cx="160" cy="10"  r="5"   fill="#C9A66B" />
            <circle cx="270" cy="160" r="3"   fill="#7FE0C8" />
          </svg>

          <div className="relative max-w-2xl">
            <div className="text-[11px] uppercase tracking-[0.18em] mb-3 text-brass">
              Morning Briefing
            </div>
            <h2 className="font-display text-3xl lg:text-4xl leading-tight">
              Three decisions need you before noon.{" "}
              <span className="text-muted">Everything else can wait.</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted max-w-lg">
              The Q3 partnership terms are ready for review, the product launch
              timeline shifted by four days, and your 2 pm with the investor
              group still has an open agenda item.
            </p>
            <div className="mt-6 flex gap-3">
              <button className="px-4 py-2 rounded-lg text-sm font-medium bg-brass text-[#1a140a] hover:opacity-90 transition-opacity">
                Review priorities
              </button>
              <button className="px-4 py-2 rounded-lg text-sm font-medium bg-panel-2 hover:bg-white/[0.06] transition-colors">
                Delegate to Vela
              </button>
            </div>
          </div>
        </Panel>

        {/* ── Main content: Ledger (wide) + Side column ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Priority Ledger — full attention, no competition */}
          <Panel className="lg:col-span-2 overflow-hidden">
            <div className="px-6 py-5 flex items-center justify-between border-b border-line">
              <h3 className="font-display text-xl">Priority Ledger</h3>
              <span className="text-xs font-mono text-muted">
                {String(sortedLedger.length).padStart(2, "0")} items
              </span>
            </div>

            <div className="divide-y divide-line">
              {sortedLedger.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <span
                    className={cn(
                      "font-mono text-xs w-10 shrink-0",
                      item.urgency === "normal" ? "text-muted" : "text-brass"
                    )}
                  >
                    {String(item.rank).padStart(2, "0")}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.title}</div>
                    <div className="text-xs mt-0.5 text-muted truncate">{item.context}</div>
                  </div>

                  <span
                    className={cn(
                      "text-xs px-2 py-1 rounded-full whitespace-nowrap shrink-0",
                      urgencyStyles[item.urgency]
                    )}
                  >
                    {item.due}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          {/* Side column: Schedule + Vela Activity */}
          <div className="space-y-6">
            <SchedulePanel />

            <Panel className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl">Vela&apos;s Activity</h3>
                {/* Live pulse indicator */}
                <span className="w-1.5 h-1.5 rounded-full bg-signal shadow-[0_0_0_4px_rgba(127,224,200,0.12)]" />
              </div>
              <ul className="space-y-3 text-sm">
                {velaActivity.map((a) => (
                  <li key={a.id} className="flex gap-2 items-start">
                    <span className="text-signal mt-px shrink-0">→</span>
                    <span className="text-muted leading-snug">{a.text}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </section>
      </main>
    </>
  );
}