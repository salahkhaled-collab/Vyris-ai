// Gathers what the morning brief needs. Every source is optional: a missing
// Google connection or a failing call leaves that section out, never the brief.

import { eventKind } from "@/lib/event-kind";
import { prisma } from "@/lib/prisma";
import { scopeFilter } from "@/lib/ai/scope";
import { getScope } from "@/lib/task-access";
import { loadAttention } from "@/lib/attention-server";
import { loadRiskSignals } from "@/lib/risk-signals-server";
import { getGoogleAccessToken } from "@/lib/google-token";
import { findUnansweredThreads, getMailboxAddress } from "@/lib/gmail";
import { calendarWindow, safeTimeZone } from "@/lib/calendar";
import { companyHint, matchProjects } from "@/lib/meeting-brief";
import { buildBrief, type BriefMeeting, type MorningBrief } from "@/lib/morning-brief";
import { loadOpenCommitments } from "@/lib/commitments-server";
import type { Unanswered } from "@/lib/unanswered";

const GOOGLE_TIMEOUT_MS = 10_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

/** Today's meetings (user's own day), or null when Calendar isn't connected. */
export async function todaysMeetings(
  userId: string,
  timeZone: string,
  now: Date,
  projects: { title: string }[]
): Promise<BriefMeeting[] | null> {
  const { accessToken } = await getGoogleAccessToken(userId, "calendar");
  if (!accessToken) return null;
  const { start, end } = calendarWindow("today", now, timeZone);
  const params = new URLSearchParams({
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "20",
  });
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    items?: {
      summary?: string;
      status?: string;
      start?: { dateTime?: string; date?: string };
      attendees?: { email?: string; self?: boolean; resource?: boolean; responseStatus?: string }[];
      hangoutLink?: string;
      conferenceData?: unknown;
      extendedProperties?: { private?: Record<string, string> };
    }[];
  };
  return (data.items ?? [])
    .filter((e) => e.status !== "cancelled")
    .filter((e) => !(e.attendees ?? []).some((a) => a.self && a.responseStatus === "declined"))
    .map((e) => {
      const attendees = (e.attendees ?? [])
        .filter((a) => !a.self && !a.resource && a.email)
        .map((a) => (a.email as string).toLowerCase());
      const title = (e.summary ?? "(No title)").replace(/[<>]/g, " ").slice(0, 120);
      const companies = attendees.map(companyHint).filter((c): c is string => Boolean(c));
      const match = matchProjects(projects, title, companies)[0];
      return {
        title,
        start: e.start?.dateTime ?? e.start?.date ?? "",
        allDay: !e.start?.dateTime,
        attendees,
        project: match?.title ?? null,
        kind: eventKind(e),
      };
    });
}

/** Emails waiting on the user's reply, or null if Gmail isn't connected or fails. */
export type InboxStatus = "ok" | "not_connected" | "failed" | "not_checked";

export async function unansweredFor(userId: string, now: Date): Promise<{ list: Unanswered[] | null; status: InboxStatus }> {
  try {
    const { accessToken } = await getGoogleAccessToken(userId, "gmail");
    if (!accessToken) return { list: null, status: "not_connected" };
    const me = await getMailboxAddress(accessToken);
    if (!me) return { list: null, status: "failed" };
    const list = await withTimeout(findUnansweredThreads(accessToken, me, now), GOOGLE_TIMEOUT_MS);
    return list ? { list, status: "ok" } : { list: null, status: "failed" };
  } catch (err) {
    console.error("[brief] unanswered-email check failed:", err);
    return { list: null, status: "failed" };
  }
}

export interface LoadedBrief {
  brief: MorningBrief;
  timeZone: string;
  /** Why "waiting on your reply" is missing, so the card doesn't say "connect Gmail" after a timeout. */
  inbox: InboxStatus;
}

/**
 * Everything for one user's brief. `withInbox` adds "waiting on your reply"
 * (about a dozen Gmail calls), so the daily email includes it and the Home
 * card asks for it only when the user opens the card's inbox section.
 */
export async function loadBrief(
  userId: string,
  now: Date = new Date(),
  opts: { withInbox?: boolean } = {}
): Promise<LoadedBrief> {
  const scope = await getScope(userId);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { timeZone: true } }).catch(() => null);
  const timeZone = safeTimeZone(user?.timeZone);
  const projects = await prisma.project
    .findMany({ where: { ...scopeFilter(scope), status: "ACTIVE" }, select: { title: true }, take: 50 })
    .catch(() => [] as { title: string }[]);

  const [report, signals, meetings, unanswered, commitments] = await Promise.all([
    loadAttention(scope, now),
    loadRiskSignals(scope, now).catch(() => null),
    withTimeout(todaysMeetings(userId, timeZone, now, projects).catch(() => null), GOOGLE_TIMEOUT_MS),
    opts.withInbox ? unansweredFor(userId, now) : Promise.resolve({ list: null, status: "not_checked" as const }),
    loadOpenCommitments(userId, now, timeZone),
  ]);

  return {
    timeZone,
    inbox: unanswered.status,
    brief: buildBrief({
      report,
      meetings,
      unanswered: unanswered.list,
      changes: signals?.unusualChanges ?? [],
      goals: signals?.objectivesBehind ?? [],
      commitments,
      now,
      timeZone,
    }),
  };
}
