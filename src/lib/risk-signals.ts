// src/lib/risk-signals.ts
//
// Evidence for "what could go wrong", computed from real workspace data across
// modules: project delivery (tasks), people (workload), strategy (objectives
// and bets) and the risk register itself. Pure and client-safe.
//
// These are signals, not risks. The AI turns them into proposed risks with an
// explanation, and nothing is written to the risk register without approval.

import { buildAttentionReport, type AttentionTaskInput } from "./attention";
import { objectivePace, type KeyResultLike } from "./okr";
import type { UnusualChange } from "./trends";

export interface SignalTaskInput extends AttentionTaskInput {
  ownerId: string;
  assigneeId: string | null;
}

export interface SignalInput {
  tasks: SignalTaskInput[];
  projects: { id: string; title: string; status: string }[];
  objectives: { id: string; title: string; quarter: string; keyResults: KeyResultLike[] }[];
  bets: { id: string; title: string; status: string }[];
  openRisks: { id: string; title: string; severity: string; status: string }[];
  people: { id: string; name: string | null }[];
}

export interface ProjectSignal {
  projectId: string;
  title: string;
  openTasks: number;
  overdue: number;
  blocked: number;
  /** Blocked reasons, for explaining why delivery is stuck. */
  blockedReasons: string[];
}

export interface WorkloadSignal {
  userId: string;
  name: string;
  openTasks: number;
  overdue: number;
  blocked: number;
  /** Carries clearly more than an even share; only set for teams of 2+. */
  overloaded: boolean;
}

export interface ObjectiveSignal {
  objectiveId: string;
  title: string;
  quarter: string;
  progress: number;
  expected: number;
  missed: boolean;
}

export interface RiskSignals {
  projects: ProjectSignal[];
  workload: WorkloadSignal[];
  objectivesBehind: ObjectiveSignal[];
  betsAtRisk: { id: string; title: string; status: string }[];
  openHighRisks: { id: string; title: string; severity: string; status: string }[];
  /** Today's numbers that moved sharply against the user's recent days. */
  unusualChanges: UnusualChange[];
  total: number;
}

/** Someone is overloaded when they hold at least this many open tasks... */
export const OVERLOAD_MIN_TASKS = 5;
/** ...and at least this multiple of the team's average. */
export const OVERLOAD_FACTOR = 1.5;

export function buildRiskSignals(input: SignalInput, now: Date): RiskSignals {
  const activeIds = new Set(input.projects.filter((p) => p.status === "ACTIVE").map((p) => p.id));
  const openTasks = input.tasks.filter((t) => t.status !== "DONE");

  const attention = buildAttentionReport(
    openTasks,
    input.projects.map((p) => ({ ...p, openTaskCount: openTasks.filter((t) => t.projectId === p.id).length })),
    now
  );
  const overdueIds = new Set(attention.overdue.map((i) => i.taskId));
  const blockedIds = new Set(attention.blocked.map((i) => i.taskId));

  // Delivery: active projects with overdue or blocked work, worst first.
  const projects: ProjectSignal[] = input.projects
    .filter((p) => activeIds.has(p.id))
    .map((p) => {
      const tasks = openTasks.filter((t) => t.projectId === p.id);
      return {
        projectId: p.id,
        title: p.title,
        openTasks: tasks.length,
        overdue: tasks.filter((t) => overdueIds.has(t.id)).length,
        blocked: tasks.filter((t) => blockedIds.has(t.id)).length,
        blockedReasons: tasks
          .filter((t) => blockedIds.has(t.id) && t.blockedReason)
          .map((t) => String(t.blockedReason))
          .slice(0, 5),
      };
    })
    .filter((p) => p.overdue + p.blocked > 0)
    .sort((a, b) => b.blocked + b.overdue - (a.blocked + a.overdue));

  // Workload: who is responsible for open work (assignee, else owner).
  const names = new Map(input.people.map((p) => [p.id, p.name ?? "Unnamed"]));
  const byPerson = new Map<string, WorkloadSignal>();
  for (const task of openTasks) {
    const userId = task.assigneeId ?? task.ownerId;
    const entry =
      byPerson.get(userId) ??
      { userId, name: names.get(userId) ?? "Unknown", openTasks: 0, overdue: 0, blocked: 0, overloaded: false };
    entry.openTasks += 1;
    if (overdueIds.has(task.id)) entry.overdue += 1;
    if (blockedIds.has(task.id)) entry.blocked += 1;
    byPerson.set(userId, entry);
  }
  const workload = [...byPerson.values()].sort((a, b) => b.openTasks - a.openTasks);
  if (workload.length >= 2) {
    const average = workload.reduce((sum, w) => sum + w.openTasks, 0) / workload.length;
    for (const w of workload) {
      w.overloaded = w.openTasks >= OVERLOAD_MIN_TASKS && w.openTasks >= average * OVERLOAD_FACTOR;
    }
  }

  // Strategy: objectives behind pace or missed, and bets flagged at risk.
  const objectivesBehind: ObjectiveSignal[] = [];
  for (const o of input.objectives) {
    const pace = objectivePace(o.quarter, o.keyResults, now);
    if (pace?.behind) {
      objectivesBehind.push({
        objectiveId: o.id,
        title: o.title,
        quarter: o.quarter,
        progress: pace.progress,
        expected: pace.expected,
        missed: pace.missed,
      });
    }
  }
  objectivesBehind.sort((a, b) => b.expected - b.progress - (a.expected - a.progress));

  const betsAtRisk = input.bets.filter((b) => b.status === "AT_RISK" || b.status === "OFF_TRACK");

  // Already-tracked serious risks, so the AI doesn't propose duplicates.
  const openHighRisks = input.openRisks.filter(
    (r) => r.status !== "RESOLVED" && (r.severity === "HIGH" || r.severity === "CRITICAL")
  );

  const overloaded = workload.filter((w) => w.overloaded).length;
  return {
    projects,
    workload,
    objectivesBehind,
    betsAtRisk,
    openHighRisks,
    unusualChanges: [],
    total: projects.length + overloaded + objectivesBehind.length + betsAtRisk.length,
  };
}
