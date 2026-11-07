// src/lib/automation/messages.ts
//
// The text of automation emails, built from real data (no AI), so reports are
// exact, free, and never hit the AI provider's rate limit. Pure.

import type { AttentionReport } from "@/lib/attention";
import type { RiskSignals } from "@/lib/risk-signals";

const APP_URL_FALLBACK = "https://vyris.vercel.app";

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

function section(title: string, lines: string[], empty: string): string {
  return [`${title}`, ...(lines.length > 0 ? lines.map((l) => `  - ${l}`) : [`  ${empty}`])].join("\n");
}

export function taskEventEmail(
  kind: "task_blocked" | "task_done",
  task: { title: string; projectTitle: string; blockedReason?: string | null },
  appUrl = APP_URL_FALLBACK
): { subject: string; body: string } {
  if (kind === "task_blocked") {
    return {
      subject: `Blocked: ${task.title} (${task.projectTitle})`,
      body: [
        `"${task.title}" in ${task.projectTitle} is now blocked.`,
        `Waiting on: ${task.blockedReason?.trim() || "no reason given"}`,
        "",
        `Open Projects: ${appUrl}/projects`,
        "",
        "Sent by a Vyris automation rule.",
      ].join("\n"),
    };
  }
  return {
    subject: `Done: ${task.title} (${task.projectTitle})`,
    body: [`"${task.title}" in ${task.projectTitle} was marked done.`, "", `Open Projects: ${appUrl}/projects`, "", "Sent by a Vyris automation rule."].join("\n"),
  };
}

export function overdueEmail(
  task: { title: string; projectTitle: string; dueDate: string | null; daysOverdue?: number },
  appUrl = APP_URL_FALLBACK
): { subject: string; body: string } {
  return {
    subject: `Overdue: ${task.title} (${task.projectTitle})`,
    body: [
      `"${task.title}" in ${task.projectTitle} was due ${fmtDate(task.dueDate)}${task.daysOverdue ? ` (${task.daysOverdue} day${task.daysOverdue === 1 ? "" : "s"} ago)` : ""}.`,
      "",
      `Open Projects: ${appUrl}/projects`,
      "",
      "Sent by a Vyris automation rule.",
    ].join("\n"),
  };
}

export function digestEmail(report: AttentionReport, now: Date, appUrl = APP_URL_FALLBACK): { subject: string; body: string } {
  const counts = `${report.blocked.length} blocked, ${report.overdue.length} overdue, ${report.dueSoon.length} due soon`;
  return {
    subject: `Vyris daily digest: ${report.total === 0 ? "all clear" : counts}`,
    body: [
      `Your morning digest for ${now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}.`,
      "",
      section("Blocked", report.blocked.slice(0, 10).map((i) => `${i.title} (${i.projectTitle}): ${i.blockedReason || "no reason given"}`), "Nothing blocked."),
      "",
      section("Overdue", report.overdue.slice(0, 10).map((i) => `${i.title} (${i.projectTitle}), ${i.daysOverdue} day${i.daysOverdue === 1 ? "" : "s"} late`), "Nothing overdue."),
      "",
      section("Due in the next 3 days", report.dueSoon.slice(0, 10).map((i) => `${i.title} (${i.projectTitle}), due ${fmtDate(i.dueDate)}`), "Nothing due soon."),
      "",
      section("Active projects with no open tasks", report.idleProjects.slice(0, 10).map((p) => p.title), "None."),
      "",
      `Open Vyris: ${appUrl}/projects`,
      "",
      "Sent by a Vyris automation rule.",
    ].join("\n"),
  };
}

export function weeklyEmail(
  data: { completed: { title: string; projectTitle: string }[]; report: AttentionReport; signals: RiskSignals },
  weekLabel: string,
  appUrl = APP_URL_FALLBACK
): { subject: string; body: string } {
  const { completed, report, signals } = data;
  return {
    subject: `Vyris weekly report (${weekLabel}): ${completed.length} done, ${report.blocked.length} blocked, ${report.overdue.length} overdue`,
    body: [
      `Your week in Vyris (${weekLabel}).`,
      "",
      section("Completed in the last 7 days", completed.slice(0, 15).map((t) => `${t.title} (${t.projectTitle})`), "Nothing completed."),
      "",
      section("Still blocked", report.blocked.slice(0, 10).map((i) => `${i.title} (${i.projectTitle}): ${i.blockedReason || "no reason given"}`), "Nothing blocked."),
      "",
      section("Overdue", report.overdue.slice(0, 10).map((i) => `${i.title} (${i.projectTitle}), ${i.daysOverdue} days late`), "Nothing overdue."),
      "",
      section(
        "Objectives behind pace",
        signals.objectivesBehind.slice(0, 5).map((o) => (o.missed ? `${o.title}: ${o.quarter} ended at ${o.progress}%` : `${o.title}: ${o.progress}% done, ${o.expected}% of ${o.quarter} gone`)),
        "All on pace."
      ),
      "",
      section("Strategic bets at risk", signals.betsAtRisk.slice(0, 5).map((b) => `${b.title} (${b.status === "OFF_TRACK" ? "off track" : "at risk"})`), "None."),
      "",
      section("Bottlenecks", signals.workload.filter((w) => w.overloaded).slice(0, 5).map((w) => `${w.name}: ${w.openTasks} open tasks`), "None."),
      "",
      `Open Vyris: ${appUrl}/risks`,
      "",
      "Sent by a Vyris automation rule.",
    ].join("\n"),
  };
}
