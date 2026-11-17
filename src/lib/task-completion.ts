// src/lib/task-completion.ts
//
// Task.completedAt records when a task was marked DONE, so "shipped this
// week" means finished this week, not "done and edited this week".

/** The completedAt change for a status change: set, clear, or leave alone (undefined). */
export function completedAtChange(previous: string, next: string, now: Date = new Date()): Date | null | undefined {
  if (next === "DONE" && previous !== "DONE") return now;
  if (next !== "DONE" && previous === "DONE") return null;
  return undefined;
}
