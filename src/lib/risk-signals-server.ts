// src/lib/risk-signals-server.ts
//
// Loads the data behind lib/risk-signals for one user's scope. Used by both the
// /api/risk-signals route (Risks page) and the get_risk_signals AI tool, so the
// page and the assistant always see the same evidence. Server-only.

import { prisma } from "@/lib/prisma";
import { scopeFilter, type Scope } from "@/lib/ai/scope";
import { getScope, taskAccessWhere } from "@/lib/task-access";
import { buildRiskSignals, type RiskSignals } from "@/lib/risk-signals";
import { detectUnusualChanges, snapshotDay, HISTORY_DAYS, type TrendMetrics } from "@/lib/trends";
import { overdueCutoff } from "@/lib/attention";

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

  const signals = buildRiskSignals(
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

  // Unusual changes: today's numbers against the user's own recent days.
  try {
    const tz = await userTimeZone(scope.userId);
    const today = await captureSnapshot(scope, now, tz);
    const history = await prisma.workspaceSnapshot.findMany({
      where: { userId: scope.userId, day: { lt: snapshotDay(now, tz) } },
      orderBy: { day: "desc" },
      take: HISTORY_DAYS,
      select: { openTasks: true, overdue: true, blocked: true, doneLast7: true, createdLast7: true },
    });
    signals.unusualChanges = detectUnusualChanges(history.reverse(), today);
    signals.total += signals.unusualChanges.filter((c) => c.direction === "worse").length;
  } catch (err) {
    console.error("Unusual-change check failed:", err); // signals still work without it
  }
  return signals;
}

/** Today's numbers for one user's view of the workspace. */
export async function measureWorkspace(scope: Scope, now: Date = new Date()): Promise<TrendMetrics> {
  const access = taskAccessWhere(scope);
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const [openTasks, overdue, blocked, doneLast7, createdLast7] = await Promise.all([
    prisma.task.count({ where: { ...access, status: { not: "DONE" } } }),
    prisma.task.count({ where: { ...access, status: { not: "DONE" }, dueDate: { lt: overdueCutoff(now) } } }),
    prisma.task.count({ where: { ...access, status: "BLOCKED" } }),
    prisma.task.count({ where: { ...access, status: "DONE", updatedAt: { gte: weekAgo } } }),
    prisma.task.count({ where: { ...access, createdAt: { gte: weekAgo } } }),
  ]);
  return { openTasks, overdue, blocked, doneLast7, createdLast7 };
}

/** Measure and save today's snapshot (one row per user per day; re-running updates it). */
export async function captureSnapshot(scope: Scope, now: Date = new Date(), timeZone?: string): Promise<TrendMetrics> {
  const metrics = await measureWorkspace(scope, now);
  const day = snapshotDay(now, timeZone ?? (await userTimeZone(scope.userId)));
  await prisma.workspaceSnapshot.upsert({
    where: { userId_day: { userId: scope.userId, day } },
    create: { userId: scope.userId, day, ...metrics },
    update: metrics,
  });
  return metrics;
}

/**
 * Called by the daily cron: today's snapshot for everyone who owns or is
 * assigned tasks, so the comparison has history even on days nobody opens
 * Risks. Stops at `deadline` (ms timestamp).
 */
export async function captureDailySnapshots(now: Date, deadline: number): Promise<{ users: number; saved: number }> {
  const [owners, assignees] = await Promise.all([
    prisma.task.findMany({ distinct: ["ownerId"], select: { ownerId: true }, take: 500 }),
    prisma.task.findMany({ where: { assigneeId: { not: null } }, distinct: ["assigneeId"], select: { assigneeId: true }, take: 500 }),
  ]);
  const userIds = [...new Set([...owners.map((o) => o.ownerId), ...assignees.map((a) => a.assigneeId as string)])];
  let saved = 0;
  for (const userId of userIds) {
    if (Date.now() > deadline) break;
    try {
      await captureSnapshot(await getScope(userId), now);
      saved += 1;
    } catch (err) {
      console.error(`[snapshots] user ${userId} failed:`, err);
    }
  }
  return { users: userIds.length, saved };
}

/** The user's saved IANA zone, or UTC. */
async function userTimeZone(userId: string): Promise<string> {
  try {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { timeZone: true } });
    return u?.timeZone ?? "UTC";
  } catch {
    return "UTC"; // a missing zone must never stop the numbers being saved
  }
}
