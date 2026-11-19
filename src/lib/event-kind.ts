// src/lib/event-kind.ts
//
// Not everything on a calendar is a meeting. A meeting has other people (or a
// video link); anything else — "Pay rent", "Call the bank", "Gym" — is a
// reminder. Events made in Vyris carry their kind explicitly. Pure.

export type EventKind = "meeting" | "reminder";
export const EVENT_KINDS: readonly EventKind[] = ["meeting", "reminder"];

export interface KindInput {
  attendees?: { email?: string; self?: boolean; resource?: boolean }[];
  hangoutLink?: string | null;
  conferenceData?: unknown;
  extendedProperties?: { private?: Record<string, string> };
}

export function eventKind(e: KindInput): EventKind {
  const tagged = e.extendedProperties?.private?.vyrisKind;
  if (tagged === "reminder" || tagged === "meeting") return tagged;
  const others = (e.attendees ?? []).some((a) => !a.self && !a.resource && a.email);
  return others || e.hangoutLink || e.conferenceData ? "meeting" : "reminder";
}

/** "2026-11-20T15:00:00" plus minutes, as wall-clock text (the timezone travels separately). */
export function addMinutesWallClock(dateTime: string, minutes: number): string {
  if (/(Z|[+-]\d{2}:?\d{2})$/.test(dateTime)) {
    const t = new Date(dateTime).getTime();
    return Number.isNaN(t) ? dateTime : new Date(t + minutes * 60_000).toISOString();
  }
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(:\d{2})?/.exec(dateTime);
  if (!m) return dateTime;
  const d = new Date(`${m[1]}:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d.toISOString().slice(0, 19);
}
