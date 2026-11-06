// src/lib/risk-signals-server.ts
//
// Loads the data behind lib/risk-signals for one user's scope. Used by both the
// /api/risk-signals route (Risks page) and the get_risk_signals AI tool, so the
// page and the assistant always see the same evidence. Server-only.

import { prisma } from "@/lib/prisma";
import { scopeFilter, type Scope } from "@/lib/ai/scope";
import { taskAccessWhere } from "@/lib/task-access";
import { buildRiskSignals, type RiskSignals } from "@/lib/risk-signals";

const MAX_TASKS = 1000;

export async function loadRiskSignals(scope: Scope, now: Date = new Date()): Promise<RiskSignals> {
  const where = scopeFilter(scope);
  const [tasks, projects, objectives, bets, openRisks, members] = await Promise.all([
    prisma.task.findMany({
      where: { ...taskAccessWhere(scope), status: { not: "DONE" } },
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        blockedReason: true,
        projectId: true,
        ownerId: true,
        assigneeId: true,
        project: { select: { title: true } },
      },
      take: MAX_TASKS,
    }),
    prisma.project.findMany({
      where: { ...where, status: "ACTIVE" },
      select: { id: true, title: true, status: true },
      take: 200,
    }),
    prisma.objective.findMany({
      where,
      select: { id: true, title: true, quarter: true, keyResults: { select: { current: true, target: true } } },
      take: 100,
    }),
    prisma.strategicBet.findMany({ where, select: { id: true, title: true, status: true }, take: 100 }),
    prisma.risk.findMany({
      where: { ...where, status: { not: "RESOLVED" } },
      select: { id: true, title: true, severity: true, status: true },
      take: 100,
    }),
    prisma.user.findMany({
      where: scope.teamId ? { teamId: scope.teamId } : { id: scope.userId },
      select: { id: true, name: true },
      take: 200,
    }),
  ]);

  return buildRiskSignals(
    {
      tasks: tasks.map((t) => ({ ...t, projectTitle: t.project.title })),
      projects,
      objectives,
      bets,
      openRisks,
      people: members,
    },
    now
  );
}
