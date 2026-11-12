// Workspace facts for comparing decision options. Pure formatter: turns risk
// signals into a short, bounded text block the model can cite, so a
// recommendation rests on the business's real numbers, not only on the
// options the user typed.

import type { RiskSignals } from "./risk-signals";

const MAX_CHARS = 1500;

export function formatDecisionEvidence(
  signals: RiskSignals,
  activeProjects: { title: string; openTasks: number }[]
): string {
  const lines: string[] = [];
  if (activeProjects.length) {
    lines.push(
      "Active projects: " +
        activeProjects
          .slice(0, 8)
          .map((p) => `${p.title} (${p.openTasks} open tasks)`)
          .join("; ")
    );
  }
  for (const p of signals.projects.slice(0, 4)) {
    lines.push(`Delivery: ${p.title} has ${p.blocked} blocked and ${p.overdue} overdue of ${p.openTasks} open tasks.`);
  }
  const busy = signals.workload.filter((w) => w.overloaded).slice(0, 3);
  for (const w of busy) lines.push(`Capacity: ${w.name} carries ${w.openTasks} open tasks (overloaded).`);
  if (signals.workload.length && !busy.length) {
    const total = signals.workload.reduce((n, w) => n + w.openTasks, 0);
    lines.push(`Capacity: ${total} open tasks across ${signals.workload.length} people, nobody overloaded.`);
  }
  for (const o of signals.objectivesBehind.slice(0, 4)) {
    lines.push(
      o.missed
        ? `Goal missed: ${o.title} ended ${o.quarter} at ${o.progress}%.`
        : `Goal behind: ${o.title} is ${o.progress}% done with ${o.expected}% of ${o.quarter} gone.`
    );
  }
  for (const b of signals.betsAtRisk.slice(0, 3)) lines.push(`Bet ${b.status === "OFF_TRACK" ? "off track" : "at risk"}: ${b.title}.`);
  for (const r of signals.openHighRisks.slice(0, 3)) lines.push(`Open ${r.severity.toLowerCase()} risk: ${r.title}.`);
  for (const c of signals.unusualChanges.filter((c) => c.direction === "worse").slice(0, 2)) lines.push(`Unusual: ${c.label}.`);
  const text = lines.join("\n");
  return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + "…" : text;
}
