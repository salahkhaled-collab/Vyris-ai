// src/lib/project-view.ts
//
// One line per project for the list: what's next, or what's stuck. Pure.

import { overdueCutoff } from "./attention";

export interface StepTask {
  title: string;
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
  dueDate: string | null;
  blockedReason: string | null;
}

export interface NextStep {
  text: string;
  tone: "warn" | "muted";
}

const dueDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Blocked work first (it stops everything else), then the open task due
 * soonest (late ones say so), then any open task. Null when all done.
 */
export function nextStep(tasks: StepTask[], now: Date): NextStep | null {
  const open = tasks.filter((t) => t.status !== "DONE");
  if (open.length === 0) return null;
  const blocked = open.find((t) => t.status === "BLOCKED");
  if (blocked) return { text: `Blocked: ${blocked.title}${blocked.blockedReason ? ` (${blocked.blockedReason})` : ""}`, tone: "warn" };
  const dated = open.filter((t) => t.dueDate).sort((a, b) => new Date(a.dueDate as string).getTime() - new Date(b.dueDate as string).getTime());
  const first = dated[0];
  if (first) {
    const late = new Date(first.dueDate as string).getTime() < overdueCutoff(now).getTime();
    return { text: `${late ? "Late" : "Next"}: ${first.title} · ${late ? "was due" : "due"} ${dueDay(first.dueDate as string)}`, tone: late ? "warn" : "muted" };
  }
  return { text: `Next: ${open[0].title}`, tone: "muted" };
}

/** Share of tasks done, 0-100. */
export function percentDone(tasks: { status: string }[]): number {
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter((t) => t.status === "DONE").length / tasks.length) * 100);
}
