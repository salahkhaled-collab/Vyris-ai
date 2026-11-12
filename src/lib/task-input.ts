import type { TaskStatus } from "@prisma/client";

/** Pure checks for task input from the API, so bad input is a 400, never a crash. */

export const MAX_TASK_TITLE = 300;
export const MAX_BLOCKED_REASON = 500;
const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];

type Err = { error: string; message: string };

/** "" or null clears the date; anything else must be a real date. */
export function parseDueDate(v: unknown): Date | null | Err {
  if (v === null || v === "") return null;
  if (typeof v !== "string" || v.length > 40) return { error: "invalid_due_date", message: "That due date isn't valid." };
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return { error: "invalid_due_date", message: "That due date isn't valid." };
  return d;
}

function isErr(v: unknown): v is Err {
  return typeof v === "object" && v !== null && "error" in v;
}

export type TaskPatch = {
  title?: string;
  status?: TaskStatus;
  dueDate?: Date | null;
  assigneeId?: string | null;
  blockedReason?: string | null;
};

export function parseTaskPatch(body: unknown): TaskPatch | Err {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { error: "invalid_body", message: "Send the task changes as JSON." };
  }
  const b = body as Record<string, unknown>;
  const out: TaskPatch = {};

  if (b.title !== undefined) {
    const title = typeof b.title === "string" ? b.title.trim() : "";
    if (!title) return { error: "missing_title", message: "A task needs a title." };
    out.title = title.slice(0, MAX_TASK_TITLE);
  }
  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status as TaskStatus)) return { error: "invalid_status", message: "Unknown task status." };
    out.status = b.status as TaskStatus;
  }
  if (b.dueDate !== undefined) {
    const d = parseDueDate(b.dueDate);
    if (isErr(d)) return d;
    out.dueDate = d;
  }
  if (b.assigneeId !== undefined) {
    if (b.assigneeId !== null && (typeof b.assigneeId !== "string" || b.assigneeId.length > 100)) {
      return { error: "invalid_assignee", message: "Unknown assignee." };
    }
    out.assigneeId = b.assigneeId as string | null;
  }
  if (b.blockedReason !== undefined) {
    if (b.blockedReason !== null && typeof b.blockedReason !== "string") {
      return { error: "invalid_blocked_reason", message: "The blocked reason must be text." };
    }
    out.blockedReason = b.blockedReason === null ? null : (b.blockedReason as string).trim().slice(0, MAX_BLOCKED_REASON) || null;
  }
  return out;
}

export type TaskCreate = { title: string; dueDate: Date | null; assigneeId: string | null };

export function parseTaskCreate(body: unknown): TaskCreate | Err {
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (!title) return { error: "missing_title", message: "A task needs a title." };
  const due = b.dueDate === undefined ? null : parseDueDate(b.dueDate);
  if (isErr(due)) return due;
  if (b.assigneeId !== undefined && b.assigneeId !== null && (typeof b.assigneeId !== "string" || b.assigneeId.length > 100)) {
    return { error: "invalid_assignee", message: "Unknown assignee." };
  }
  return { title: title.slice(0, MAX_TASK_TITLE), dueDate: due, assigneeId: (b.assigneeId as string | null | undefined) || null };
}
