// src/lib/calendar.ts
//
// Pure calendar helpers shared by the Meetings page and the meeting-brief
// route: double-booking detection and free focus-time slots. Client-safe.
// Times are compared as absolute instants; "working hours" use the local
// timezone of whoever runs the code (the browser, for focus slots).

export interface CalendarItem {
  id: string;
  title: string;
  /** ISO start; date-only ("2026-11-09") for all-day events. */
  start: string | null;
  end: string | null;
  allDay: boolean;
  /** The user's own RSVP, when they are an attendee. */
  selfStatus?: "accepted" | "declined" | "tentative" | "needsAction" | null;
  /** Google "transparency: transparent": shows as free. */
  free?: boolean;
}

interface Span {
  id: string;
  title: string;
  s: number;
  e: number;
}

/** Events that actually take the user's time: timed, not declined, not marked free. */
function busySpans(events: CalendarItem[]): Span[] {
  const out: Span[] = [];
  for (const ev of events) {
    if (ev.allDay || ev.free || ev.selfStatus === "declined" || !ev.start || !ev.end) continue;
    const s = new Date(ev.start).getTime();
    const e = new Date(ev.end).getTime();
    if (Number.isNaN(s) || Number.isNaN(e) || e <= s) continue;
    out.push({ id: ev.id, title: ev.title, s, e });
  }
  return out.sort((a, b) => a.s - b.s);
}

/**
 * Overlapping meetings, per event id: the titles of the events it clashes
 * with. Back-to-back meetings (one ends exactly when the next starts) are fine.
 */
export function findConflicts(events: CalendarItem[]): Record<string, string[]> {
  const spans = busySpans(events);
  const out: Record<string, string[]> = {};
  for (let i = 0; i < spans.length; i++) {
    for (let j = i + 1; j < spans.length && spans[j].s < spans[i].e; j++) {
      (out[spans[i].id] ??= []).push(spans[j].title);
      (out[spans[j].id] ??= []).push(spans[i].title);
    }
  }
  return out;
}

export interface FocusSlot {
  start: Date;
  end: Date;
}

export interface FocusOptions {
  dayStartHour?: number;
  dayEndHour?: number;
  minMinutes?: number;
  maxMinutes?: number;
  days?: number;
  limit?: number;
}

const ceilTo15 = (t: number) => Math.ceil(t / 900_000) * 900_000;

/**
 * Free blocks of at least `minMinutes` inside working hours on weekdays,
 * over the next `days` weekdays, starting from now (rounded up to the next quarter hour, plus 30 minutes so
 * the first suggestion is still actionable). Each block is capped at
 * `maxMinutes`; at most one suggestion per day, longest gap first.
 */
export function findFocusSlots(events: CalendarItem[], now: Date, opts: FocusOptions = {}): FocusSlot[] {
  const { dayStartHour = 9, dayEndHour = 18, minMinutes = 90, maxMinutes = 120, days = 5, limit = 3 } = opts;
  const busy = busySpans(events);
  const earliest = ceilTo15(now.getTime() + 30 * 60_000);
  const slots: FocusSlot[] = [];

  // Scan the next `days` weekdays (weekends are skipped, not counted).
  for (let d = 0, weekdays = 0; weekdays < days && slots.length < limit; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue;
    weekdays++;
    const open = Math.max(new Date(day).setHours(dayStartHour, 0, 0, 0), earliest);
    const close = new Date(day).setHours(dayEndHour, 0, 0, 0);
    if (close - open < minMinutes * 60_000) continue;

    // Walk the day's busy spans and keep the longest free gap.
    let cursor = open;
    let best: { s: number; e: number } | null = null;
    const consider = (s: number, e: number) => {
      if (e - s >= minMinutes * 60_000 && (!best || e - s > best.e - best.s)) best = { s, e };
    };
    for (const b of busy) {
      if (b.e <= cursor || b.s >= close) continue;
      consider(cursor, Math.min(b.s, close));
      cursor = Math.max(cursor, b.e);
      if (cursor >= close) break;
    }
    if (cursor < close) consider(cursor, close);
    const chosen = best as { s: number; e: number } | null;
    if (chosen) {
      slots.push({ start: new Date(chosen.s), end: new Date(Math.min(chosen.e, chosen.s + maxMinutes * 60_000)) });
    }
  }
  return slots;
}

/** The title Vyris gives focus blocks it creates. */
export const FOCUS_TITLE = "Focus time";

// ── Time zones ─────────────────────────────────────────────────────────────
// The server runs in UTC, so "today" and event times must be computed in the
// user's own zone (sent by the browser), not the server's.

/** A valid IANA zone name, or "UTC". */
export function safeTimeZone(tz: string | null | undefined): string {
  if (!tz || tz.length > 64) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

/** Calendar date (and weekday, 0 = Sunday) of an instant in a zone. */
export function zonedDate(at: Date, tz: string): { y: number; m: number; d: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { y: Number(get("year")), m: Number(get("month")) - 1, d: Number(get("day")), weekday };
}

/** Minutes the zone is ahead of UTC at an instant. */
function offsetMinutes(at: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(at);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

/** The instant of local midnight starting day (y, m, d) in a zone. m is 0-based and may overflow. */
export function zonedMidnight(y: number, m: number, d: number, tz: string): Date {
  const guess = Date.UTC(y, m, d);
  let t = guess - offsetMinutes(new Date(guess), tz) * 60000;
  t = guess - offsetMinutes(new Date(t), tz) * 60000; // second pass settles DST edges
  return new Date(t);
}

/** Query window for the calendar page ranges, in the user's zone. */
export function calendarWindow(range: "today" | "week" | "month", now: Date, tz: string): { start: Date; end: Date } {
  const today = zonedDate(now, tz);
  if (range === "month") {
    const first = zonedDate(zonedMidnight(today.y, today.m, 1, tz), tz);
    const lastDay = new Date(Date.UTC(today.y, today.m + 1, 0)).getUTCDate();
    const last = zonedDate(zonedMidnight(today.y, today.m, lastDay, tz), tz);
    // Pad to whole weeks (Sunday to Saturday) for the grid.
    const start = zonedMidnight(today.y, today.m, 1 - first.weekday, tz);
    const end = new Date(zonedMidnight(today.y, today.m, lastDay + (6 - last.weekday) + 1, tz).getTime() - 1);
    return { start, end };
  }
  const start = zonedMidnight(today.y, today.m, today.d, tz);
  const days = range === "week" ? 7 : 1;
  return { start, end: new Date(zonedMidnight(today.y, today.m, today.d + days, tz).getTime() - 1) };
}
