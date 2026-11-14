// Gathers the facts for the weekly founder update from the workspace.

import { prisma } from "@/lib/prisma";
import { scopeFilter } from "@/lib/ai/scope";
import { getScope, taskAccessWhere } from "@/lib/task-access";
import { loadAttention } from "@/lib/attention-server";
import { loadRiskSignals } from "@/lib/risk-signals-server";
import { safeTimeZone } from "@/lib/calendar";
import { isOverdue } from "@/lib/commitments";
import { periodLabel, type UpdateFacts } from "@/lib/founder-update";

const WEEK_MS = 7 * 86_400_000;

export async function loadUpdateFacts(userId: string, now: Date = new Date()): Promise<{ facts: UpdateFacts; timeZone: string }> {
  const scope = await getScope(userId);
  const where = scopeFilter(scope);
  const since = new Date(now.getTime() - WEEK_MS);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { timeZone: true } }).catch(() => null);
  const timeZone = safeTimeZone(user?.timeZone);

  const [done, report, signals, keyResults, newProjects, kept, openPromises] = await Promise.all([
    prisma.task.findMany({
      // Finished in the period: completedAt, not updatedAt (a rename would count).
      where: { ...taskAccessWhere(scope), status: "DONE", completedAt: { gte: since } },
      select: { title: true, project: { select: { title: true } } },
      orderBy: { completedAt: "desc" },
      take: 20,
    }),
    loadAttention(scope, now),
    loadRiskSignals(scope, now).catch(() => null),
    prisma.keyResult
      .findMany({
        where: { objective: where },
        select: { label: true, current: true, target: true, unit: true, objective: { select: { title: true } } },
        take: 12,
      })
      .catch(() => []),
    prisma.project
      .findMany({ where: { ...where, createdAt: { gte: since } }, select: { title: true }, take: 10 })
      .catch(() => []),
    prisma.commitment
      .count({ where: { ownerId: userId, status: "DONE", doneAt: { gte: since } } })
      .catch(() => 0),
    prisma.commitment
      .findMany({
        where: { ownerId: userId, status: "OPEN", direction: "MINE", dueDate: { not: null } },
        select: { text: true, counterpart: true, dueDate: true },
        take: 50,
      })
      .catch(() => []),
  ]);

  const slipped = [
    ...report.blocked.map((b) => ({ title: b.title, project: b.projectTitle, why: b.blockedReason ? `blocked: ${b.blockedReason}` : "blocked" })),
    ...report.overdue.map((o) => ({ title: o.title, project: o.projectTitle, why: `${o.daysOverdue ?? 0} days late` })),
  ].slice(0, 10);

  return {
    timeZone,
    facts: {
      period: periodLabel(now, timeZone),
      shipped: done.map((t) => ({ title: t.title, project: t.project.title })),
      slipped,
      metrics: keyResults.map((k) => ({ label: k.label, current: k.current, target: k.target, unit: k.unit, objective: k.objective.title })),
      goals: (signals?.objectivesBehind ?? []).slice(0, 5).map((g) => ({
        title: g.title, quarter: g.quarter, progress: g.progress, expected: g.expected, missed: g.missed,
      })),
      betsAtRisk: (signals?.betsAtRisk ?? []).slice(0, 5).map((b) => ({ title: b.title, status: b.status })),
      risks: (signals?.openHighRisks ?? []).slice(0, 5).map((r) => ({ title: r.title, severity: r.severity })),
      promisesKept: kept,
      promisesLate: openPromises
        .filter((p) => isOverdue(p.dueDate, now, timeZone))
        .slice(0, 5)
        .map((p) => ({ text: p.text, counterpart: p.counterpart })),
      newProjects: newProjects.map((p) => p.title),
    },
  };
}
