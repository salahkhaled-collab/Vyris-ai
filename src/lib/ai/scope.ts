// lib/ai/scope.ts
//
// Every Vyris domain model has an `ownerId` and an optional `teamId`.
// This is the single place that turns (userId, teamId) into the Prisma
// `where` clause every tool executor reuses — so access control lives
// in one spot instead of being copy-pasted into every query.

export type Scope = {
  userId: string;
  teamId: string | null;
};

/**
 * Returns a Prisma `where` fragment: records owned by this user,
 * OR (if they're on a team) records belonging to that team.
 * Spread this into any model's `where` clause.
 */
export function scopeFilter(scope: Scope) {
  const or: Record<string, unknown>[] = [{ ownerId: scope.userId }];
  if (scope.teamId) {
    or.push({ teamId: scope.teamId });
  }
  return { OR: or };
}