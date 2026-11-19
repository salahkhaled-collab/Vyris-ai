// src/lib/today-view.ts
//
// Small, pure helpers for the phone "Today" screen: greeting, who sent it,
// which chip colour a focus item gets, and the next meeting.

import type { BriefFocus, BriefMeeting } from "./morning-brief";

/** Hour of day (0-23) in a zone. */
export function hourIn(now: Date, timeZone: string): number {
  try {
    return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(now));
  } catch {
    return now.getUTCHours();
  }
}

export function greeting(now: Date, timeZone: string): string {
  const h = hourIn(now, timeZone);
  return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** "THURSDAY, 20 NOVEMBER" in the user's zone. */
export function dateLabel(now: Date, timeZone: string): string {
  try {
    return now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone }).toUpperCase();
  } catch {
    return now.toDateString().toUpperCase();
  }
}

/** First name from a full name, or "" (the greeting then has no name). */
export function firstName(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

/** "Omar Haddad <omar@x.com>" → "Omar Haddad"; a bare address → its local part. */
export function senderName(from: string): string {
  const m = /^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/.exec(from);
  if (m) return m[1].trim();
  const at = from.indexOf("@");
  return (at > 0 ? from.slice(0, at) : from).replace(/[<>"]/g, "").trim() || from;
}

/** Up to two letters for an avatar. Works for Arabic names too. */
export function initials(name: string): string {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length >= 2 ? [parts[0], parts[parts.length - 1]] : parts.slice(0, 1);
  return letters.map((p) => Array.from(p)[0] ?? "").join("").toUpperCase() || "?";
}

export type Tone = "brand" | "warn" | "neutral" | "signal";

/** Late or blocked work is amber; someone waiting on you is wine; the rest neutral. */
export function focusTone(kind: BriefFocus["kind"]): Tone {
  if (kind === "blocked" || kind === "overdue") return "warn";
  if (kind === "reply" || kind === "promise") return "brand";
  return "neutral";
}

/** The next timed meeting that hasn't ended (assumes 1 hour if unknown), else null. */
export function nextMeeting(meetings: BriefMeeting[] | null, now: Date): BriefMeeting | null {
  if (!meetings) return null;
  const timed = meetings
    .filter((m) => !m.allDay && !Number.isNaN(new Date(m.start).getTime()))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return timed.find((m) => new Date(m.start).getTime() + 60 * 60_000 > now.getTime()) ?? null;
}

/** "in 2 hours", "in 25 min", "now". */
export function startsIn(startIso: string, now: Date): string {
  const min = Math.round((new Date(startIso).getTime() - now.getTime()) / 60_000);
  if (min <= 0) return "now";
  if (min < 60) return `in ${min} min`;
  const h = Math.round(min / 60);
  return `in ${h} hour${h === 1 ? "" : "s"}`;
}

/** Done ticks for today's focus list, kept on this device only. */
export function doneKey(dayKey: string): string {
  return `vyris.today.done.${dayKey}`;
}
