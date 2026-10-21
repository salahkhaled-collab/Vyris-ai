// lib/task-access.ts
//
// One place that decides who can see/touch a task, built on the same
// scopeFilter the AI tools already use. A task is visible when:
//   - you created it (ownerId), or
//   - it is assigned to you (assigneeId), or
//   - its project is yours or shared with your team.
//
// A solo user has no team and never sets an assignee, so this reduces to
// "tasks I own or whose project I own" — identical to the old behaviour.

import { prisma } from "@/lib/prisma";
import { scopeFilter, type Scope } from "@/lib/ai/scope";

export function taskAccessWhere(scope: Scope) {
  return {
    OR: [
      { ownerId: scope.userId },
      { assigneeId: scope.userId },
      { project: scopeFilter(scope) },
    ],
  };
}

// Delete/manage rights: owner or project-level access, but NOT assignee-only.
export function taskManageWhere(scope: Scope) {
  return {
    OR: [{ ownerId: scope.userId }, { project: scopeFilter(scope) }],
  };
}

export async function getScope(userId: string): Promise<Scope> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { teamId: true },
  });
  return { userId, teamId: user?.teamId ?? null };
}

/**
 * An assignee must be the caller themselves, or a member of the caller's team.
 * A solo user (no team) can therefore only ever assign to themselves.
 */
export async function isValidAssignee(scope: Scope, assigneeId: string) {
  if (assigneeId === scope.userId) return true;
  if (!scope.teamId) return false;
  const assignee = await prisma.user.findUnique({
    where: { id: assigneeId },
    select: { teamId: true },
  });
  return assignee?.teamId === scope.teamId;
}
