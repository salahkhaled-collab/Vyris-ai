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

export interface PendingAction {
  /** The model's tool-call id; unique within one reply. */
  id: string;
  tool: VyrisToolName;
  input: Record<string, unknown>;
  /** One line the user reads before approving, e.g. Create project "Q3 launch". */
  summary: string;
}

/** What the model is told instead of a tool result: nothing happened yet. */
export const AWAITING_APPROVAL = {
  ok: true,
  status: "awaiting_user_approval",
  note:
    "Nothing was changed. This action is shown to the user with Approve and Dismiss buttons. Tell them briefly what you proposed and that it happens only when they approve. Do not claim it is done.",
};

const str = (v: unknown, max = 120): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const q = (v: string) => `"${v}"`;

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
      return `Remember: ${q(str(input.content, 200))}`;
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
