
export type Scope = {
  userId: string;
  teamId: string | null;
};

export function scopeFilter(scope: Scope) {
  const or: Record<string, unknown>[] = [{ ownerId: scope.userId }];
  if (scope.teamId) {
    or.push({ teamId: scope.teamId });
  }
  return { OR: or };
}