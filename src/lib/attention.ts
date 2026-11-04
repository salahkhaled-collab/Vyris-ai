// src/lib/attention.ts
//
// One definition of "what needs attention", shared by the Projects page (client)
// and the AI layer (server), so the two can never disagree.
//
// Pure and dependency-free on purpose: no Prisma, no server imports, so it is
// safe to import from "use client" files and trivial to test.
//
// Rules:
//   * DONE tasks never need attention.
//   * BLOCKED: status is BLOCKED (reported even if it is also overdue).
//   * Overdue: the due day has fully passed. Due dates are stored as midnight,
//     so "dueDate < now" would flag a task as overdue on the morning it is due.
//   * Due soon: not overdue, not blocked, due within DUE_SOON_DAYS.
//   * Idle project: an ACTIVE project with no open tasks, i.e. no next step.

export const DUE_SOON_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Tasks due before this instant are overdue: their whole due day has passed. */
export function overdueCutoff(now: Date): Date {
  return new Date(now.getTime() - DAY_MS);
}

export interface AttentionTaskInput {
  id: string;
  title: string;
  status: string;
  dueDate: Date | string | null;
  blockedReason?: string | null;
  projectId: string;
  projectTitle: string;
}

export interface AttentionProjectInput {
  id: string;
  title: string;
  status: string;
  openTaskCount: number;
}

export interface AttentionItem {
  taskId: string;
  title: string;
  projectId: string;
  projectTitle: string;
  dueDate: string | null;
  /** Whole days past the due day; only set when overdue. */
  daysOverdue?: number;
  /** Whole days until due; only set for due-soon items. */
  daysUntilDue?: number;
  blockedReason?: string | null;
}

export interface AttentionReport {
  overdue: AttentionItem[];
  blocked: AttentionItem[];
  dueSoon: AttentionItem[];
  idleProjects: { id: string; title: string }[];
  total: number;
}

function toDate(value: Date | string | null): Date | null {
  if (value === null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildAttentionReport(
  tasks: AttentionTaskInput[],
  projects: AttentionProjectInput[],
  now: Date
): AttentionReport {
  const cutoff = overdueCutoff(now).getTime();
  const soonLimit = now.getTime() + DUE_SOON_DAYS * DAY_MS;

  const overdue: AttentionItem[] = [];
  const blocked: AttentionItem[] = [];
  const dueSoon: AttentionItem[] = [];

  for (const task of tasks) {
    if (task.status === "DONE") continue;
    const due = toDate(task.dueDate);
    const base: AttentionItem = {
      taskId: task.id,
      title: task.title,
      projectId: task.projectId,
      projectTitle: task.projectTitle,
      dueDate: due ? due.toISOString() : null,
    };
    const isOverdue = due !== null && due.getTime() < cutoff;
    const daysOverdue = isOverdue && due ? Math.floor((cutoff - due.getTime()) / DAY_MS) + 1 : undefined;

    if (task.status === "BLOCKED") {
      blocked.push({ ...base, blockedReason: task.blockedReason ?? null, daysOverdue });
    } else if (isOverdue) {
      overdue.push({ ...base, daysOverdue });
    } else if (due !== null && due.getTime() <= soonLimit) {
      const daysUntilDue = Math.max(0, Math.ceil((due.getTime() - now.getTime()) / DAY_MS));
      dueSoon.push({ ...base, daysUntilDue });
    }
  }

  overdue.sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0));
  dueSoon.sort((a, b) => (a.daysUntilDue ?? 0) - (b.daysUntilDue ?? 0));

  const idleProjects = projects
    .filter((p) => p.status === "ACTIVE" && p.openTaskCount === 0)
    .map((p) => ({ id: p.id, title: p.title }));

  return {
    overdue,
    blocked,
    dueSoon,
    idleProjects,
    total: overdue.length + blocked.length + dueSoon.length + idleProjects.length,
  };
}
