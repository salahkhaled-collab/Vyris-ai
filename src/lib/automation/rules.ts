// src/lib/automation/rules.ts
//
// What an automation rule can be. Rules are structured (a trigger key and an
// action object), never free text, so the engine can run them exactly.
// Pure and client-safe: the builder UI and the server share these definitions.

export const TRIGGERS = {
  task_blocked: { label: "A task becomes blocked", runs: "instantly", taskTrigger: true },
  task_done: { label: "A task is marked done", runs: "instantly", taskTrigger: true },
  task_overdue: { label: "A task becomes overdue", runs: "daily check, once per task", taskTrigger: true },
  daily_digest: { label: "Every morning (daily digest)", runs: "daily", taskTrigger: false },
  weekly_report: { label: "Every Monday (weekly report)", runs: "weekly", taskTrigger: false },
} as const;

export type TriggerKey = keyof typeof TRIGGERS;
export const TRIGGER_KEYS = Object.keys(TRIGGERS) as TriggerKey[];
export const SCHEDULED_TRIGGERS: TriggerKey[] = ["task_overdue", "daily_digest", "weekly_report"];

export type RuleAction =
  | { type: "email_me" }
  | { type: "create_task"; title: string; dueInDays: number };

export const ACTION_LABELS: Record<RuleAction["type"], string> = {
  email_me: "Email me",
  create_task: "Create a follow-up task",
};

export const DEFAULT_TASK_TITLE = "Follow up: {task}";
const MAX_TITLE = 200;
const MAX_DUE_DAYS = 60;

export function isTriggerKey(value: unknown): value is TriggerKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(TRIGGERS, value);
}

/** Which actions make sense for a trigger: follow-up tasks need a task to follow up on. */
export function actionsFor(trigger: TriggerKey): RuleAction["type"][] {
  return TRIGGERS[trigger].taskTrigger ? ["email_me", "create_task"] : ["email_me"];
}

/** Validate and normalise an action object from a request or the database. */
export function normalizeAction(value: unknown): RuleAction | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (v.type === "email_me") return { type: "email_me" };
  if (v.type === "create_task") {
    const title = typeof v.title === "string" ? v.title.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE) : "";
    const days = typeof v.dueInDays === "number" && Number.isFinite(v.dueInDays) ? Math.round(v.dueInDays) : 2;
    return { type: "create_task", title: title || DEFAULT_TASK_TITLE, dueInDays: Math.min(MAX_DUE_DAYS, Math.max(0, days)) };
  }
  return null;
}

/** Parse the stored action column. Old free-text rules return null (not runnable). */
export function parseAction(raw: string): RuleAction | null {
  try {
    return normalizeAction(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function validateRule(trigger: unknown, action: unknown): { trigger: TriggerKey; action: RuleAction } | string {
  if (!isTriggerKey(trigger)) return "Choose when the rule should run.";
  const parsed = normalizeAction(action);
  if (!parsed) return "Choose what the rule should do.";
  if (!actionsFor(trigger).includes(parsed.type)) {
    return `"${ACTION_LABELS[parsed.type]}" doesn't work with "${TRIGGERS[trigger].label}".`;
  }
  return { trigger, action: parsed };
}

/** A rule is runnable when it uses the structured format. */
export function isRunnable(rule: { trigger: string; action: string }): boolean {
  return isTriggerKey(rule.trigger) && parseAction(rule.action) !== null;
}

/** Fill {task} and {project} into a task title template. */
export function renderTitle(template: string, vars: { task: string; project: string }): string {
  return template
    .replace(/\{task\}/gi, vars.task)
    .replace(/\{project\}/gi, vars.project)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TITLE);
}

export function describeRule(trigger: TriggerKey, action: RuleAction): string {
  const then =
    action.type === "email_me"
      ? "email me"
      : `create "${action.title}" due in ${action.dueInDays} day${action.dueInDays === 1 ? "" : "s"}`;
  return `When ${TRIGGERS[trigger].label.charAt(0).toLowerCase()}${TRIGGERS[trigger].label.slice(1)}, ${then}.`;
}

/** YYYY-MM-DD in UTC. */
export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** ISO week key like 2026-W45, for once-a-week dedupe. */
export function weekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
