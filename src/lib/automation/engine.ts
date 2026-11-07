// src/lib/automation/engine.ts
//
// Runs automation rules. Server-only.
//
//   * Task events (blocked, done) run instantly from the task routes and the AI.
//   * Scheduled triggers (overdue, daily digest, weekly report) run from the
//     daily cron route.
//
// Every execution first claims a row in AutomationRun keyed by
// (ruleId, dedupeKey). If the key exists, the rule already fired for that thing
// and is skipped, so "overdue" emails once per task, not every day, and a
// double click can't fire twice. Failures are recorded, never thrown to the
// caller: a broken rule must never break marking a task done.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { scopeFilter, type Scope } from "@/lib/ai/scope";
import { getScope, taskAccessWhere } from "@/lib/task-access";
import { overdueCutoff } from "@/lib/attention";
import { loadAttention } from "@/lib/attention-server";
import { loadRiskSignals } from "@/lib/risk-signals-server";
import { getGoogleAccessToken } from "@/lib/google-token";
import { buildRawMessage, getMailboxAddress } from "@/lib/gmail";
import { sendEmail } from "@/lib/email";
import { dayKey, parseAction, renderTitle, weekKey, type RuleAction, type TriggerKey } from "./rules";
import { digestEmail, overdueEmail, taskEventEmail, weeklyEmail } from "./messages";

const MAX_OVERDUE_PER_RULE = 20;
const APP_URL = process.env.NEXTAUTH_URL || "https://vyris.vercel.app";

export interface TaskEventTask {
  id: string;
  title: string;
  projectId: string;
  projectTitle: string;
  ownerId: string;
  blockedReason?: string | null;
  dueDate?: Date | string | null;
}

type RuleRow = { id: string; ownerId: string; trigger: string; action: string };
type Outcome = { status: "SUCCESS" | "FAILED" | "SKIPPED"; detail: string };

// ── Claiming runs (dedupe) ─────────────────────────────────────────────────

/** Returns the run id, or null if this rule already fired for this key. */
async function claimRun(ruleId: string, dedupeKey: string): Promise<string | null> {
  try {
    const run = await prisma.automationRun.create({
      data: { ruleId, dedupeKey, status: "SKIPPED", detail: "Running..." },
      select: { id: true },
    });
    return run.id;
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return null;
    throw err;
  }
}

async function finishRun(runId: string, outcome: Outcome): Promise<void> {
  await prisma.automationRun.update({
    where: { id: runId },
    data: { status: outcome.status, detail: outcome.detail.slice(0, 500) },
  });
}

async function runOnce(rule: RuleRow, dedupeKey: string, work: () => Promise<Outcome>): Promise<Outcome | null> {
  const runId = await claimRun(rule.id, dedupeKey);
  if (!runId) return null;
  let outcome: Outcome;
  try {
    outcome = await work();
  } catch (err: unknown) {
    console.error(`[automation] rule ${rule.id} failed:`, err);
    outcome = { status: "FAILED", detail: err instanceof Error ? err.message : "Unexpected error" };
  }
  await finishRun(runId, outcome).catch((e: unknown) => console.error("[automation] could not record run:", e));
  return outcome;
}

// ── Actions ────────────────────────────────────────────────────────────────

/** Email the rule owner: through their own Gmail if connected, else via Resend. */
export async function emailOwner(userId: string, subject: string, body: string): Promise<Outcome> {
  const { accessToken } = await getGoogleAccessToken(userId, "gmail");
  if (accessToken) {
    const mailbox = await getMailboxAddress(accessToken);
    if (mailbox) {
      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw: buildRawMessage({ to: mailbox, subject, body }) }),
      });
      if (res.ok) return { status: "SUCCESS", detail: `Emailed ${mailbox}` };
      console.error("[automation] Gmail send failed:", res.status, await res.text().catch(() => ""));
    }
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user?.email) return { status: "FAILED", detail: "No email address to send to." };
  const html = `<pre style="font-family:inherit;white-space:pre-wrap">${body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")}</pre>`;
  const result = await sendEmail({ to: user.email, subject, html });
  return result.sent
    ? { status: "SUCCESS", detail: `Emailed ${user.email}` }
    : { status: "FAILED", detail: `Couldn't send email: ${result.reason ?? "unknown error"}. Connect Gmail on the Inbox page.` };
}

/** Create a follow-up task in the same project, if the rule owner may add tasks there. */
async function createFollowUp(rule: RuleRow, action: Extract<RuleAction, { type: "create_task" }>, task: TaskEventTask): Promise<Outcome> {
  const scope = await getScope(rule.ownerId);
  const project = await prisma.project.findFirst({
    where: { id: task.projectId, ...scopeFilter(scope) },
    select: { id: true },
  });
  if (!project) return { status: "FAILED", detail: `No access to project "${task.projectTitle}".` };
  const title = renderTitle(action.title, { task: task.title, project: task.projectTitle });
  const dueDate = new Date(Date.now() + action.dueInDays * 86_400_000);
  dueDate.setUTCHours(0, 0, 0, 0);
  await prisma.task.create({ data: { title, projectId: project.id, ownerId: rule.ownerId, dueDate } });
  return { status: "SUCCESS", detail: `Created task "${title}"` };
}

async function runTaskAction(rule: RuleRow, action: RuleAction, kind: TriggerKey, task: TaskEventTask): Promise<Outcome> {
  if (action.type === "create_task") return createFollowUp(rule, action, task);
  const email =
    kind === "task_overdue"
      ? overdueEmail(
          {
            title: task.title,
            projectTitle: task.projectTitle,
            dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
          },
          APP_URL
        )
      : taskEventEmail(kind === "task_done" ? "task_done" : "task_blocked", task, APP_URL);
  return emailOwner(rule.ownerId, email.subject, email.body);
}

// ── Task events (instant) ──────────────────────────────────────────────────

/**
 * A task just became BLOCKED or DONE. Runs the active rules of the task owner
 * and the project owner (deduped). Never throws.
 */
export async function emitTaskEvent(kind: "task_blocked" | "task_done", task: TaskEventTask, now: Date = new Date()): Promise<void> {
  try {
    const project = await prisma.project.findUnique({ where: { id: task.projectId }, select: { ownerId: true } });
    const owners = Array.from(new Set([task.ownerId, project?.ownerId].filter((v): v is string => Boolean(v))));
    const rules = await prisma.automationRule.findMany({
      where: { ownerId: { in: owners }, status: "ACTIVE", trigger: kind },
      select: { id: true, ownerId: true, trigger: true, action: true },
      take: 50,
    });
    for (const rule of rules) {
      const action = parseAction(rule.action);
      if (!action) continue;
      // Once per task per day: re-blocking tomorrow fires again, a double click doesn't.
      await runOnce(rule, `${kind}:${task.id}:${dayKey(now)}`, () => runTaskAction(rule, action, kind, task));
    }
  } catch (err: unknown) {
    console.error("[automation] task event failed:", err);
  }
}

// ── Scheduled triggers (daily cron) ────────────────────────────────────────

async function runOverdueRule(rule: RuleRow, action: RuleAction, scope: Scope, now: Date): Promise<number> {
  const tasks = await prisma.task.findMany({
    where: {
      ...taskAccessWhere(scope),
      status: { notIn: ["DONE", "BLOCKED"] },
      dueDate: { lt: overdueCutoff(now) },
    },
    select: { id: true, title: true, projectId: true, ownerId: true, dueDate: true, project: { select: { title: true } } },
    orderBy: { dueDate: "asc" },
    take: MAX_OVERDUE_PER_RULE,
  });
  let fired = 0;
  for (const t of tasks) {
    const task: TaskEventTask = { ...t, projectTitle: t.project.title };
    // Once per task per due date: moving the due date and missing it again fires again.
    const key = `task_overdue:${t.id}:${t.dueDate ? dayKey(t.dueDate) : "none"}`;
    if (await runOnce(rule, key, () => runTaskAction(rule, action, "task_overdue", task))) fired += 1;
  }
  return fired;
}

async function digestOutcome(rule: RuleRow, scope: Scope, now: Date): Promise<Outcome> {
  const report = await loadAttention(scope, now);
  const email = digestEmail(report, now, APP_URL);
  return emailOwner(rule.ownerId, email.subject, email.body);
}

async function weeklyOutcome(rule: RuleRow, scope: Scope, now: Date): Promise<Outcome> {
  const since = new Date(now.getTime() - 7 * 86_400_000);
  const [completed, report, signals] = await Promise.all([
    prisma.task.findMany({
      where: { ...taskAccessWhere(scope), status: "DONE", updatedAt: { gte: since } },
      select: { title: true, project: { select: { title: true } } },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    loadAttention(scope, now),
    loadRiskSignals(scope, now),
  ]);
  const email = weeklyEmail(
    { completed: completed.map((t) => ({ title: t.title, projectTitle: t.project.title })), report, signals },
    weekKey(now),
    APP_URL
  );
  return emailOwner(rule.ownerId, email.subject, email.body);
}

/** Run one scheduled rule now. `force` uses a unique key (the "Run now" button). */
export async function runScheduledRule(rule: RuleRow, now: Date, force = false): Promise<Outcome | null> {
  const action = parseAction(rule.action);
  if (!action) return { status: "SKIPPED", detail: "Old text rule: recreate it to make it run." };
  const scope = await getScope(rule.ownerId);
  const suffix = force ? `manual:${now.getTime()}` : "";

  switch (rule.trigger) {
    case "task_overdue": {
      const fired = await runOverdueRule(rule, action, scope, now);
      return { status: "SUCCESS", detail: fired === 0 ? "No newly overdue tasks." : `Handled ${fired} overdue task${fired === 1 ? "" : "s"}.` };
    }
    case "daily_digest":
      return runOnce(rule, suffix || `daily_digest:${dayKey(now)}`, () => digestOutcome(rule, scope, now));
    case "weekly_report":
      return runOnce(rule, suffix || `weekly_report:${weekKey(now)}`, () => weeklyOutcome(rule, scope, now));
    default:
      return { status: "SKIPPED", detail: "This rule runs instantly, not on a schedule." };
  }
}

/** Called by the daily cron. Weekly reports only go out on Mondays (UTC). */
export async function runScheduled(now: Date = new Date()): Promise<{ rules: number; failed: number }> {
  const triggers = ["task_overdue", "daily_digest", ...(now.getUTCDay() === 1 ? ["weekly_report"] : [])];
  const rules = await prisma.automationRule.findMany({
    where: { status: "ACTIVE", trigger: { in: triggers } },
    select: { id: true, ownerId: true, trigger: true, action: true },
    take: 500,
  });
  let failed = 0;
  for (const rule of rules) {
    try {
      const outcome = await runScheduledRule(rule, now);
      if (outcome?.status === "FAILED") failed += 1;
    } catch (err: unknown) {
      failed += 1;
      console.error(`[automation] scheduled rule ${rule.id} crashed:`, err);
    }
  }
  return { rules: rules.length, failed };
}

/**
 * Call after any task update. Fires task_blocked / task_done only on a real
 * transition into that status. Never throws.
 */
export async function afterTaskStatusChange(taskId: string, previous: string, next: string): Promise<void> {
  if (previous === next || (next !== "BLOCKED" && next !== "DONE")) return;
  try {
    const t = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, title: true, projectId: true, ownerId: true, blockedReason: true, dueDate: true, project: { select: { title: true } } },
    });
    if (!t) return;
    await emitTaskEvent(next === "BLOCKED" ? "task_blocked" : "task_done", { ...t, projectTitle: t.project.title });
  } catch (err: unknown) {
    console.error("[automation] status hook failed:", err);
  }
}
