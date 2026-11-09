// src/lib/calendar-events.ts
//
// Validation for creating Google Calendar events from Vyris. Pure.

const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?)?/;

function validTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length === 0 || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Day after `date` (YYYY-MM-DD), computed in UTC so no timezone can shift it. */
function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Google's all-day end date is exclusive: the day after the last day (inclusive input). */
export function allDayEnd(start: string, end: string): string {
  return nextDay(end > start ? end : start);
}

type EventInput = {
  title: string;
  startTime: string;
  endTime: string | null;
  allDay: boolean;
  description: string | undefined;
  timeZone: string | null;
};

export function parseEventInput(body: unknown): EventInput | { error: string } {
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim().slice(0, 300) : "";
  const startTime = typeof b.startTime === "string" ? b.startTime : "";
  const endTime = typeof b.endTime === "string" && b.endTime ? b.endTime : null;
  if (!title || !DATE_TIME.test(startTime) || (endTime && !DATE_TIME.test(endTime))) {
    return { error: "Title and a valid start time are required." };
  }
  const allDay = b.allDay === true;
  const timeZone = validTimeZone(b.timeZone) ? b.timeZone : null;
  if (!allDay && !timeZone && (!HAS_OFFSET.test(startTime) || (endTime !== null && !HAS_OFFSET.test(endTime)))) {
    return { error: "Missing timezone. Refresh the page and try again." };
  }
  const endsBeforeStart = HAS_OFFSET.test(startTime) && endTime && HAS_OFFSET.test(endTime)
    ? new Date(endTime).getTime() < new Date(startTime).getTime()
    : endTime !== null && endTime < startTime; // same wall-clock format compares as text
  if (!allDay && endsBeforeStart) {
    return { error: "The end time is before the start time." };
  }
  const description = typeof b.description === "string" ? b.description.slice(0, 5000) : undefined;
  return { title, startTime, endTime, allDay, description, timeZone };
}
