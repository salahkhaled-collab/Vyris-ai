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
import { buildRawMessage, findUnansweredThreads, getMailboxAddress } from "@/lib/gmail";
import type { Unanswered } from "@/lib/unanswered";
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

const RUNNING = "Running...";
/** A claim still "Running..." after this long was cut off (function timeout) and may be retried. */
export const STALE_CLAIM_MS = 10 * 60_000;

/**
 * Returns the run id, or null if this rule already fired for this key. A claim
 * left "Running..." by a run that was killed part way is taken over once it is
 * stale, so a timeout can't block that rule for that key forever.
 */
async function claimRun(ruleId: string, dedupeKey: string, now: Date = new Date()): Promise<string | null> {
  try {
    const run = await prisma.automationRun.create({
      data: { ruleId, dedupeKey, status: "SKIPPED", detail: RUNNING },
      select: { id: true },
    });
    return run.id;
  } catch (err: unknown) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
    const existing = await prisma.automationRun.findFirst({
      where: { ruleId, dedupeKey, detail: RUNNING, createdAt: { lt: new Date(now.getTime() - STALE_CLAIM_MS) } },
      select: { id: true, createdAt: true },
    });
    if (!existing) return null;
    // Conditional on the old timestamp: of two runs taking over, only one wins.
    const taken = await prisma.automationRun.updateMany({
      where: { id: existing.id, detail: RUNNING, createdAt: existing.createdAt },
      data: { createdAt: now },
    });
    return taken.count === 1 ? existing.id : null;
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
  const { accessToken } = await getGoogleAccessToken(userId, "gmail_send");
  if (accessToken) {
    const mailbox = await getMailboxAddress(accessToken);
    if (mailbox) {
      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
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
  const email = digestEmail(report, now, APP_URL, await unansweredFor(rule.ownerId, now));
  return emailOwner(rule.ownerId, email.subject, email.body);
}

/** Emails waiting on the owner's reply, or null if Gmail isn't connected or fails. Never blocks the digest. */
async function unansweredFor(userId: string, now: Date): Promise<Unanswered[] | null> {
  try {
    const { accessToken } = await getGoogleAccessToken(userId, "gmail");
    if (!accessToken) return null;
    const me = await getMailboxAddress(accessToken);
    if (!me) return null;
    return await Promise.race([
      findUnansweredThreads(accessToken, me, now),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000)),
    ]);
  } catch (err) {
    console.error("[automation] unanswered-email check failed:", err);
    return null;
  }
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

/** Rules run this many at a time: enough to finish well inside the cron's 60s. */
const CRON_CONCURRENCY = 5;
/** Stop starting new rules after this long, so in-flight ones can finish and be recorded. */
export const CRON_BUDGET_MS = 45_000;

/** Called by the daily cron. Weekly reports only go out on Mondays (UTC). */
export async function runScheduled(
  now: Date = new Date(),
  budgetMs: number = CRON_BUDGET_MS
): Promise<{ rules: number; failed: number; notReached: number }> {
  const started = Date.now();
  const triggers = ["task_overdue", "daily_digest", ...(now.getUTCDay() === 1 ? ["weekly_report"] : [])];
  const rules = await prisma.automationRule.findMany({
    where: { status: "ACTIVE", trigger: { in: triggers } },
    select: { id: true, ownerId: true, trigger: true, action: true },
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  // Start at a different rule each day, so if the budget runs out it isn't
  // always the same (newest) rules that miss out.
  const shift = rules.length ? Math.floor(now.getTime() / 86_400_000) % rules.length : 0;
  const ordered = [...rules.slice(shift), ...rules.slice(0, shift)];
  let failed = 0;
  let next = 0;
  let notReached = 0;
  async function worker(): Promise<void> {
    while (next < rules.length) {
      if (Date.now() - started > budgetMs) {
        notReached = rules.length - next;
        next = rules.length;
        return;
      }
      const rule = ordered[next++];
      try {
        const outcome = await runScheduledRule(rule, now);
        if (outcome?.status === "FAILED") failed += 1;
      } catch (err: unknown) {
        failed += 1;
        console.error(`[automation] scheduled rule ${rule.id} crashed:`, err);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CRON_CONCURRENCY, rules.length) }, () => worker()));
  if (notReached > 0) console.error(`[automation] time budget reached: ${notReached} rule(s) not run today`);
  return { rules: rules.length, failed, notReached };
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
