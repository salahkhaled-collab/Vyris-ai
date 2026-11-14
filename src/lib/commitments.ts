// src/lib/commitments.ts
//
// Commitment tracking: promises made in email threads, meetings or by hand.
// "I'll send the proposal Thursday" is MINE; "Omar will confirm the budget by
// Friday" is THEIRS. Pure and client-safe: validation, overdue checks and the
// parser for promises the model finds in a thread. Nothing here saves; a
// promise is tracked only when the user clicks Track (or approves it in chat).

import type { BriefCommitment } from "./morning-brief";

export const DIRECTIONS = ["MINE", "THEIRS"] as const;
export type Direction = (typeof DIRECTIONS)[number];
export const STATUSES = ["OPEN", "DONE", "DROPPED"] as const;
export type CommitmentStatusValue = (typeof STATUSES)[number];

export const MAX_TEXT = 300;
/** Open promises one user may track at once (the API and the assistant both enforce it). */
export const MAX_OPEN = 200;
export const MAX_COUNTERPART = 120;
/** Promises the model may propose from one thread. */
export const MAX_PROPOSALS = 5;

export interface CommitmentInput {
  text: string;
  counterpart: string | null;
  direction: Direction;
  /** "YYYY-MM-DD" or null. */
  dueDate: string | null;
}

/** A promise found in a thread, shown with a Track button. Not saved. */
export type ProposedCommitment = CommitmentInput;

const clean = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

/** A real calendar date "YYYY-MM-DD", or null. Rejects 2026-02-31. */
export function parseDay(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const d = new Date(`${m[0]}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === m[0] ? m[0] : null;
}

/** Validate user or model input. Direction is required and must be exact. */
export function validateCommitment(raw: unknown): { ok: true; value: CommitmentInput } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "Send a JSON object." };
  const o = raw as Record<string, unknown>;
  const text = clean(o.text, MAX_TEXT + 1);
  if (!text) return { ok: false, error: "Say what was promised." };
  if (text.length > MAX_TEXT) return { ok: false, error: `Keep it under ${MAX_TEXT} characters.` };
  const direction = typeof o.direction === "string" ? o.direction.trim().toUpperCase() : "";
  if (!(DIRECTIONS as readonly string[]).includes(direction)) {
    return { ok: false, error: "direction must be MINE (you promised) or THEIRS (they promised)." };
  }
  const counterpart = clean(o.counterpart, MAX_COUNTERPART) || null;
  let dueDate: string | null = null;
  if (o.dueDate !== undefined && o.dueDate !== null && o.dueDate !== "") {
    dueDate = parseDay(o.dueDate);
    if (!dueDate) return { ok: false, error: "dueDate must be a date like 2026-11-20." };
  }
  return { ok: true, value: { text, counterpart, direction: direction as Direction, dueDate } };
}

/** "YYYY-MM-DD" of an instant in a zone. */
export function dayIn(at: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

/** Late once the due day has fully passed in the user's own zone. */
export function isOverdue(dueDate: Date | string | null, now: Date, timeZone: string): boolean {
  if (!dueDate) return false;
  const due = typeof dueDate === "string" ? dueDate.slice(0, 10) : dueDate.toISOString().slice(0, 10);
  return due < dayIn(now, timeZone);
}

export interface StoredCommitment {
  text: string;
  counterpart: string | null;
  direction: Direction;
  dueDate: Date | null;
}

export function toBriefCommitment(c: StoredCommitment, now: Date, timeZone: string): BriefCommitment {
  return {
    text: c.text,
    counterpart: c.counterpart,
    owner: c.direction === "MINE" ? "me" : "them",
    dueDate: c.dueDate ? c.dueDate.toISOString().slice(0, 10) : null,
    overdue: isOverdue(c.dueDate, now, timeZone),
  };
}

/** Late first, then soonest due, then undated. */
export function sortCommitments<T extends { dueDate: Date | null }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
}

/**
 * Promises the model found in a thread. Invalid items are dropped, never
 * repaired, and the same promise is kept once.
 */
export function parseProposals(value: unknown): ProposedCommitment[] {
  if (!Array.isArray(value)) return [];
  const out: ProposedCommitment[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const v = validateCommitment(item);
    if (!v.ok) continue;
    const key = `${v.value.direction}:${v.value.text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v.value);
    if (out.length >= MAX_PROPOSALS) break;
  }
  return out;
}

/** "Due Thu 20 Nov" style label for the UI. */
export function dueLabel(dueDate: string | null, now: Date, timeZone: string): string {
  if (!dueDate) return "No date";
  const today = dayIn(now, timeZone);
  if (dueDate === today) return "Due today";
  const d = new Date(`${dueDate}T12:00:00.000Z`);
  const label = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  return dueDate < today ? `Was due ${label}` : `Due ${label}`;
}
