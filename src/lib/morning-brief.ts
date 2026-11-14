// src/lib/morning-brief.ts
//
// The morning brief: one message that pulls together what the separate pages
// know (tasks, inbox, calendar, numbers, goals) and leads with the few things
// that matter today. Pure: the server gathers the data, this decides what to
// say. Used by the daily email (05:00 UTC cron, 07:00 in Cairo) and by the
// "Today" card on Home.

import type { AttentionReport } from "./attention";
import type { ObjectiveSignal } from "./risk-signals";
import type { UnusualChange } from "./trends";
import type { Unanswered } from "./unanswered";

export interface BriefMeeting {
  title: string;
  /** ISO start; all-day events have a date only. */
  start: string;
  allDay: boolean;
  /** Other people invited (emails). */
  attendees: string[];
  /** A Vyris project this meeting seems to be about. */
  project: string | null;
}

export interface BriefCommitment {
  text: string;
  /** Who it's owed to, or who owes it ("you" when it's the user's promise). */
  counterpart: string | null;
  owner: "me" | "them";
  dueDate: string | null;
  overdue: boolean;
}

export interface BriefInput {
  report: AttentionReport;
  /** Today's meetings; null when Calendar isn't connected. */
  meetings: BriefMeeting[] | null;
  /** Emails waiting on the user's reply; null when Gmail isn't connected. */
  unanswered: Unanswered[] | null;
  changes: UnusualChange[];
  goals: ObjectiveSignal[];
  /** Promises being tracked (optional until commitment tracking is on). */
  commitments?: BriefCommitment[];
  now: Date;
  timeZone: string;
}

export interface BriefFocus {
  /** One line: what to do. */
  title: string;
  /** Why it made the top of the list. */
  why: string;
  kind: "blocked" | "reply" | "overdue" | "meeting" | "due" | "promise";
}

export interface MorningBrief {
  focus: BriefFocus[];
  meetings: BriefMeeting[] | null;
  unanswered: Unanswered[] | null;
  changes: UnusualChange[];
  goals: ObjectiveSignal[];
  commitments: BriefCommitment[];
  allClear: boolean;
}

const MAX_FOCUS = 3;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * The few things that matter today, most important first:
 * work that's blocking other work, promises you're late on, people who've
 * waited longest for your reply, the most overdue task, a meeting with
 * outside people that has a project to prepare, then what's due today.
 * At most one item per source until the list has room, so one busy
 * project can't fill all three spots.
 */
export function pickFocus(input: BriefInput): BriefFocus[] {
  const candidates: BriefFocus[][] = [];

  const blocked = [...input.report.blocked];
  candidates.push(
    blocked.map((b) => ({
      kind: "blocked" as const,
      title: `Unblock "${b.title}" (${b.projectTitle})`,
      why: b.blockedReason ? `Blocked: ${b.blockedReason}` : "Blocked with no reason given",
    }))
  );

  const latePromises = (input.commitments ?? []).filter((c) => c.owner === "me" && c.overdue);
  candidates.push(
    latePromises.map((c) => ({
      kind: "promise" as const,
      title: `Keep your promise: ${c.text}`,
      why: c.counterpart ? `You told ${c.counterpart}${c.dueDate ? ` by ${c.dueDate}` : ""}` : "You promised this and it's late",
    }))
  );

  const waiting = [...(input.unanswered ?? [])].filter((u) => u.daysWaiting >= 3);
  candidates.push(
    waiting.map((u) => ({
      kind: "reply" as const,
      title: `Reply to ${u.from} about "${u.subject}"`,
      why: `Waiting ${plural(u.daysWaiting, "day")}`,
    }))
  );

  const overdue = [...input.report.overdue].sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0));
  candidates.push(
    overdue.map((o) => ({
      kind: "overdue" as const,
      title: `Finish "${o.title}" (${o.projectTitle})`,
      why: `${plural(o.daysOverdue ?? 0, "day")} overdue`,
    }))
  );

  const prepMeetings = (input.meetings ?? []).filter((m) => !m.allDay && m.attendees.length > 0 && m.project);
  candidates.push(
    prepMeetings.map((m) => ({
      kind: "meeting" as const,
      title: `Prepare for "${m.title}" at ${timeIn(m.start, input.timeZone)}`,
      why: `About ${m.project}, with ${plural(m.attendees.length, "person")} outside Vyris`,
    }))
  );

  // Due dates are calendar days stored at midnight UTC: compare the stored
  // day itself, not that instant converted to the user's zone (which moves it
  // to the day before anywhere west of UTC).
  const todayKey = dateIn(input.now, input.timeZone);
  const dueToday = input.report.dueSoon.filter((d) => d.dueDate && d.dueDate.slice(0, 10) === todayKey);
  candidates.push(
    dueToday.map((d) => ({ kind: "due" as const, title: `"${d.title}" is due today`, why: d.projectTitle }))
  );

  // Round-robin: the best item from each source first, then second-best.
  const out: BriefFocus[] = [];
  for (let round = 0; out.length < MAX_FOCUS && round < MAX_FOCUS; round++) {
    for (const list of candidates) {
      if (out.length >= MAX_FOCUS) break;
      if (list[round]) out.push(list[round]);
    }
  }
  return out;
}

export function buildBrief(input: BriefInput): MorningBrief {
  const focus = pickFocus(input);
  const changes = input.changes.filter((c) => c.direction === "worse");
  const commitments = input.commitments ?? [];
  return {
    focus,
    meetings: input.meetings,
    unanswered: input.unanswered,
    changes,
    goals: input.goals,
    commitments,
    allClear:
      focus.length === 0 &&
      changes.length === 0 &&
      (input.unanswered ?? []).length === 0 &&
      (input.meetings ?? []).length === 0 &&
      input.goals.length === 0 &&
      commitments.length === 0,
  };
}

/** "YYYY-MM-DD" of an instant in a zone. */
function dateIn(at: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

/** "9:30 AM" in a zone. */
export function timeIn(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone });
  } catch {
    return d.toISOString().slice(11, 16);
  }
}

const section = (title: string, lines: string[], empty: string | null): string[] =>
  lines.length ? [title.toUpperCase(), ...lines.map((l) => `- ${l}`), ""] : empty ? [title.toUpperCase(), empty, ""] : [];

/** Plain-text email. Sections without data are left out instead of padding the email. */
export function briefEmail(brief: MorningBrief, now: Date, timeZone: string, appUrl: string): { subject: string; body: string } {
  const day = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone });
  const subject = brief.allClear
    ? "Your Vyris brief: a clear day"
    : brief.focus.length
      ? `Your Vyris brief: ${plural(brief.focus.length, "thing")} for today`
      : "Your Vyris brief for today";

  const lines: string[] = [`Good morning. Your brief for ${day}.`, ""];
  if (brief.allClear) {
    lines.push(
      `Nothing is blocked or late${brief.unanswered ? ", and nobody is waiting on your reply" : ""}. A good day to get ahead on the work that matters.`,
      ""
    );
  }
  lines.push(
    ...section(
      "Focus today",
      brief.focus.map((f, i) => `${i + 1}. ${f.title}. ${f.why}.`),
      brief.allClear ? null : "Nothing urgent. Work on what moves the business."
    )
  );
  if (brief.meetings) {
    lines.push(
      ...section(
        "Meetings today",
        brief.meetings.map((m) => {
          const when = m.allDay ? "All day" : timeIn(m.start, timeZone);
          const who = m.attendees.length ? ` with ${m.attendees.slice(0, 3).join(", ")}${m.attendees.length > 3 ? " and others" : ""}` : "";
          return `${when}: ${m.title}${who}${m.project ? ` (about ${m.project})` : ""}`;
        }),
        "No meetings. A good day for focused work."
      )
    );
  }
  if (brief.unanswered) {
    lines.push(
      ...section(
        "Waiting on your reply",
        brief.unanswered.slice(0, 8).map((u) => `${u.from}: "${u.subject}", ${plural(u.daysWaiting, "day")}`),
        null
      )
    );
  }
  lines.push(
    ...section(
      "Promises to keep",
      brief.commitments
        .filter((c) => c.owner === "me")
        .slice(0, 6)
        .map((c) => `${c.text}${c.counterpart ? ` (to ${c.counterpart})` : ""}${c.dueDate ? `, due ${c.dueDate}` : ""}${c.overdue ? ", LATE" : ""}`),
      null
    ),
    ...section(
      "Waiting on others",
      brief.commitments
        .filter((c) => c.owner === "them")
        .slice(0, 6)
        .map((c) => `${c.counterpart ?? "Someone"}: ${c.text}${c.dueDate ? `, due ${c.dueDate}` : ""}${c.overdue ? ", LATE" : ""}`),
      null
    ),
    ...section("What changed", brief.changes.map((c) => c.label), null),
    ...section(
      "Goals",
      brief.goals
        .slice(0, 4)
        .map((g) => (g.missed ? `${g.title}: ${g.quarter} ended at ${g.progress}%` : `${g.title}: ${g.progress}% done, ${g.expected}% of ${g.quarter} gone`)),
      null
    )
  );
  lines.push(`Open Vyris: ${appUrl}/dashboard`, "", "Sent by your Vyris morning brief rule.");
  return { subject, body: lines.join("\n") };
}
