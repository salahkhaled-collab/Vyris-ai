"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import type { RiskSignals } from "@/lib/risk-signals";

function isRiskSignals(value: unknown): value is RiskSignals {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<Record<keyof RiskSignals, unknown>>;
  return Array.isArray(v.projects) && Array.isArray(v.workload) && Array.isArray(v.objectivesBehind);
}

const PREVIEW = 4;

/**
 * Evidence-based risk signals from projects, workload and strategy.
 * Read-only: it shows signals; logging a risk stays a deliberate action.
 */
export function RiskSignalsPanel() {
  const [signals, setSignals] = useState<RiskSignals | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/risk-signals", { cache: "no-store" })
      .then(async (r) => {
        const data: unknown = await r.json();
        if (!r.ok || !isRiskSignals(data)) throw new Error("bad response");
        setSignals(data);
      })
      .catch(() => setFailed(true));
  }, []);

  const unusual = (signals?.unusualChanges ?? []).filter((c) => c.direction === "worse");
  if (failed || signals === null || (signals.total === 0 && unusual.length === 0)) return null;

  const overloaded = signals.workload.filter((w) => w.overloaded);
  const missed = signals.objectivesBehind.filter((o) => o.missed);
  const behind = signals.objectivesBehind.filter((o) => !o.missed);

  return (
    <Panel className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <Activity className="w-4 h-4 text-brass" strokeWidth={1.75} />
        <h3 className="text-sm font-medium">Signals from your workspace</h3>
      </div>
      <p className="text-xs text-muted mb-4">
        Computed from your projects, team, goals and how your numbers moved this week. Ask Vyris to turn any of these into a tracked risk.
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        {signals.projects.length > 0 && (
          <Group label="Delivery">
            {signals.projects.slice(0, PREVIEW).map((p) => (
              <Item
                key={p.projectId}
                title={p.title}
                detail={[
                  p.blocked > 0 ? `${p.blocked} blocked` : null,
                  p.overdue > 0 ? `${p.overdue} overdue` : null,
                  `of ${p.openTasks} open`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                note={p.blockedReasons[0] ? `Waiting on: ${p.blockedReasons[0]}` : undefined}
              />
            ))}
          </Group>
        )}
        {overloaded.length > 0 && (
          <Group label="Bottlenecks">
            {overloaded.slice(0, PREVIEW).map((w) => (
              <Item
                key={w.userId}
                title={w.name}
                detail={`${w.openTasks} open tasks${w.overdue ? ` · ${w.overdue} overdue` : ""}`}
              />
            ))}
          </Group>
        )}
        {unusual.length > 0 && (
          <Group label="Unusual changes">
            {unusual.slice(0, PREVIEW).map((c) => (
              <Item key={c.metric} title={c.label} detail="Compared with your last few days" />
            ))}
          </Group>
        )}
        {missed.length > 0 && (
          <Group label="Missed targets">
            {missed.slice(0, PREVIEW).map((o) => (
              <Item key={o.objectiveId} title={o.title} detail={`${o.quarter} ended at ${o.progress}%`} />
            ))}
          </Group>
        )}
        {behind.length > 0 && (
          <Group label="Objectives behind pace">
            {behind.slice(0, PREVIEW).map((o) => (
              <Item
                key={o.objectiveId}
                title={o.title}
                detail={`${o.progress}% done, ${o.expected}% of ${o.quarter} elapsed`}
              />
            ))}
          </Group>
        )}
        {signals.betsAtRisk.length > 0 && (
          <Group label="Strategic bets">
            {signals.betsAtRisk.slice(0, PREVIEW).map((b) => (
              <Item key={b.id} title={b.title} detail={b.status === "OFF_TRACK" ? "Off track" : "At risk"} />
            ))}
          </Group>
        )}
      </div>
    </Panel>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted mb-2">{label}</div>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function Item({ title, detail, note }: { title: string; detail: string; note?: string }) {
  return (
    <li className="min-w-0">
      {/* Titles wrap: unusual-change sentences are long, and a phone is narrow. */}
      <div className="text-sm break-words">{title}</div>
      <div className="text-xs text-muted break-words">{detail}</div>
      {note && <div className="text-xs text-muted break-words">{note}</div>}
    </li>
  );
}
