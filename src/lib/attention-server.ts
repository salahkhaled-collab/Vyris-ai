// src/lib/attention-server.ts
//
// Loads one user's tasks and projects and builds the attention report
// (lib/attention). Shared by the AI's get_attention tool and the automation
// daily digest, so both always agree. Server-only.

import { prisma } from "@/lib/prisma";
import { scopeFilter, type Scope } from "@/lib/ai/scope";
import { taskAccessWhere } from "@/lib/task-access";
import { buildAttentionReport, type AttentionReport } from "@/lib/attention";

export async function loadAttention(scope: Scope, now: Date = new Date()): Promise<AttentionReport> {
  const [tasks, projects] = await Promise.all([
    prisma.task.findMany({
      where: { ...taskAccessWhere(scope), status: { not: "DONE" } },
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        blockedReason: true,
        projectId: true,
        project: { select: { title: true } },
      },
      take: 500,
    }),
    prisma.project.findMany({
      where: { ...scopeFilter(scope), status: "ACTIVE" },
      select: {
        id: true,
        title: true,
        status: true,
        _count: { select: { tasks: { where: { status: { not: "DONE" } } } } },
      },
      take: 100,
    }),
  ]);
  return buildAttentionReport(
    tasks.map((t) => ({ ...t, projectTitle: t.project.title })),
    projects.map((p) => ({ id: p.id, title: p.title, status: p.status, openTaskCount: p._count.tasks })),
    now
  );
}
