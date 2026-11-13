// src/lib/ai/actions.ts
//
// AI actions need the user's approval. When the assistant calls a tool that
// creates or changes data, nothing runs: the call becomes a proposal shown in
// the chat with Approve / Dismiss. Approving runs the same tool, as the user,
// through POST /api/ai/actions, so every scope check in runTool still applies.

import { prisma } from "@/lib/prisma";
import { scopeFilter, type Scope } from "./scope";
import { taskAccessWhere } from "@/lib/task-access";
import type { VyrisToolName } from "./tools";

export const WRITE_TOOLS = new Set<string>([
  "remember",
  "create_project",
  "create_task",
  "update_task_status",
  "assign_task",
  "plan_project_tasks",
  "create_contact",
  "create_risk",
  "update_risk_status",
  "add_decision_options",
  "set_decision_recommendation",
  "create_decision",
  "create_objective",
]);

export function isWriteTool(name: string): name is VyrisToolName {
  return WRITE_TOOLS.has(name);
}

/** Longest text any proposed field may carry; longer proposals are refused, so nothing is hidden from the user. */
export const MAX_FIELD_CHARS = 1000;

const ENUMS: Record<string, Record<string, readonly string[]>> = {
  update_task_status: { status: ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"] },
  create_task: {},
  create_risk: { severity: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
  update_risk_status: { status: ["OPEN", "MITIGATING", "RESOLVED"] },
};

function tooLong(v: unknown): boolean {
  if (typeof v === "string") return v.length > MAX_FIELD_CHARS;
  if (Array.isArray(v)) return v.length > 30 || v.some(tooLong);
  if (v && typeof v === "object") return Object.values(v as Record<string, unknown>).some(tooLong);
  return false;
}

/**
 * One shared step before a proposal is shown AND before it runs: enum values
 * are trimmed and upper-cased and must be valid (no silent fallback to a
 * default), and no text field may exceed MAX_FIELD_CHARS. What the user
 * approves is exactly what runs.
 */
export function normalizeActionInput(
  tool: string,
  input: Record<string, unknown>
): { ok: true; input: Record<string, unknown> } | { ok: false; error: string } {
  if (tooLong(input)) return { ok: false, error: `A field is longer than ${MAX_FIELD_CHARS} characters. Shorten it.` };
  const out: Record<string, unknown> = { ...input };
  for (const [field, allowed] of Object.entries(ENUMS[tool] ?? {})) {
    if (out[field] === undefined || out[field] === null || out[field] === "") continue;
    const v = typeof out[field] === "string" ? (out[field] as string).trim().toUpperCase() : "";
    if (!allowed.includes(v)) return { ok: false, error: `${field} must be one of ${allowed.join(", ")}.` };
    out[field] = v;
  }
  return { ok: true, input: out };
}

/**
 * Every field the action will save, as "Label: value" lines, so nothing is
 * hidden behind the one-line summary. Values are shown in full (they are
 * capped at MAX_FIELD_CHARS by normalizeActionInput).
 */
export function actionDetails(input: Record<string, unknown>): string[] {
  // "dueDateISO" -> "Due date", "projectId" -> "Project id"
  const label = (k: string) => {
    const words = k.replace(/ISO$/, "").replace(/([A-Z])/g, " $1").trim().toLowerCase();
    return words.charAt(0).toUpperCase() + words.slice(1);
  };
  const show = (v: unknown): string =>
    typeof v === "string" ? v : typeof v === "number" || typeof v === "boolean" ? String(v) : JSON.stringify(v);
  const lines: string[] = [];
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null || v === "") continue;
    // Record ids are internal; the summary already names the record (looked
    // up in the caller's scope), and an id carries nothing that gets saved.
    if (/Id$/.test(k)) continue;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item && typeof item === "object") {
          const parts = Object.entries(item as Record<string, unknown>)
            .filter(([, x]) => x !== undefined && x !== null && x !== "")
            .map(([ik, x]) => `${label(ik)}: ${show(x)}`);
          lines.push(`${label(k)} ${i + 1}: ${parts.join("; ")}`);
        } else lines.push(`${label(k)} ${i + 1}: ${show(item)}`);
      });
    } else lines.push(`${label(k)}: ${show(v)}`);
  }
  return lines;
}

export interface PendingAction {
  /** The model's tool-call id; unique within one reply. */
  id: string;
  tool: VyrisToolName;
  input: Record<string, unknown>;
  /** One line the user reads before approving, e.g. Create project "Q3 launch". */
  summary: string;
  /** Every field that will be saved, shown under the summary. */
  details: string[];
}

/** What the model is told instead of a tool result: nothing happened yet. */
export const AWAITING_APPROVAL = {
  ok: true,
  status: "awaiting_user_approval",
  note:
    "Nothing was changed. This action is shown to the user with Approve and Dismiss buttons. Tell them briefly what you proposed and that it happens only when they approve. Do not claim it is done.",
};

const str = (v: unknown, max = 120): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
/** Quote a value safely: embedded quotes can't make it read as two values. */
const q = (v: string) => JSON.stringify(v);

const STATUS_LABEL: Record<string, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
  OPEN: "Open",
  MITIGATING: "Mitigating",
  RESOLVED: "Resolved",
};

/**
 * Pure part of the summary: built from the tool input and names already looked
 * up. Kept separate so it can be tested without a database.
 */
export function summarizeAction(
  tool: string,
  input: Record<string, unknown>,
  names: { task?: string; project?: string; risk?: string; decision?: string; person?: string } = {}
): string {
  const task = names.task ? q(names.task) : "a task";
  const project = names.project ?? str(input.projectTitle);
  const inProject = project ? ` in ${q(project)}` : "";
  switch (tool) {
    case "remember":
      return `Remember a note: ${q(str(input.content, MAX_FIELD_CHARS))}`;
    case "create_project":
      return `Create project ${q(str(input.title))}`;
    case "create_task": {
      const due = str(input.dueDateISO, 10);
      return `Create task ${q(str(input.title))}${inProject}${due ? `, due ${due}` : ""}`;
    }
    case "update_task_status":
      return `Mark ${task} as ${STATUS_LABEL[str(input.status)] ?? str(input.status)}`;
    case "assign_task":
      return `Assign ${task} to ${names.person ?? "a teammate"}`;
    case "plan_project_tasks": {
      const tasks = Array.isArray(input.tasks) ? input.tasks : [];
      const titles = tasks
        .map((t) => str((t as Record<string, unknown> | null)?.title, 60))
        .filter(Boolean);
      const shown = titles.slice(0, 5).map(q).join(", ");
      const more = titles.length > 5 ? ` and ${titles.length - 5} more` : "";
      return `Add ${titles.length} task${titles.length === 1 ? "" : "s"}${inProject}: ${shown}${more}`;
    }
    case "create_contact":
      return `Add contact ${q(str(input.name))}${str(input.company) ? ` (${str(input.company)})` : ""}`;
    case "create_risk":
      return `Log risk ${q(str(input.title))}`;
    case "update_risk_status":
      return `Set risk ${names.risk ? q(names.risk) : ""} to ${STATUS_LABEL[str(input.status)] ?? str(input.status)}`.replace("  ", " ");
    case "add_decision_options": {
      const n = Array.isArray(input.options) ? input.options.length : 0;
      return `Add ${n} option${n === 1 ? "" : "s"} to decision ${names.decision ? q(names.decision) : ""}`.trim();
    }
    case "set_decision_recommendation":
      return `Save a recommendation on decision ${names.decision ? q(names.decision) : ""}`.trim();
    case "create_decision":
      return `Create decision ${q(str(input.title))}${str(input.deadline, 20) ? `, decide by ${str(input.deadline, 20)}` : ""}`;
    case "create_objective":
      return `Create goal ${q(str(input.title))} for ${str(input.quarter, 20) || "this quarter"}`;
    default:
      return `Run ${tool}`;
  }
}

/** Summary with record names looked up inside the caller's scope (never outside it). */
export async function describeAction(tool: string, input: Record<string, unknown>, scope: Scope): Promise<string> {
  const where = scopeFilter(scope);
  const names: Parameters<typeof summarizeAction>[2] = {};
  try {
    const taskId = str(input.taskId, 100);
    if (taskId) {
      const t = await prisma.task.findFirst({ where: { id: taskId, ...taskAccessWhere(scope) }, select: { title: true } });
      if (t) names.task = t.title;
    }
    const projectId = str(input.projectId, 100);
    if (projectId) {
      const p = await prisma.project.findFirst({ where: { id: projectId, ...where }, select: { title: true } });
      if (p) names.project = p.title;
    }
    const riskId = str(input.riskId, 100);
    if (riskId) {
      const r = await prisma.risk.findFirst({ where: { id: riskId, ...where }, select: { title: true } });
      if (r) names.risk = r.title;
    }
    const decisionId = str(input.decisionId, 100);
    if (decisionId) {
      const d = await prisma.decision.findFirst({ where: { id: decisionId, ...where }, select: { title: true } });
      if (d) names.decision = d.title;
    }
    const assigneeId = str(input.assigneeId, 100);
    if (assigneeId) {
      const u = await prisma.user.findFirst({
        where: { id: assigneeId, ...(scope.teamId ? { teamId: scope.teamId } : { id: scope.userId }) },
        select: { name: true, email: true },
      });
      if (u) names.person = u.name ?? u.email ?? undefined;
    }
  } catch {
    // Names are a nicety; the summary still works without them.
  }
  return summarizeAction(tool, input, names);
}
