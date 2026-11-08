import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getGoogleAccessToken } from "@/lib/google-token";
import { completeWithPythonLlm, pythonLlmConfigured } from "@/lib/ai/python-client";
import { buildSystemPromptWithContext } from "@/lib/ai/context";
import { scopeFilter } from "@/lib/ai/scope";
import { getScope, taskAccessWhere } from "@/lib/task-access";
import { searchMessages } from "@/lib/gmail";
import { rateLimitMessage, rateLimitWait } from "@/lib/inbox-ai";
import {
  BRIEF_PROMPT,
  briefUserMessage,
  companyHint,
  matchProjects,
  parseBrief,
  type BriefAttendee,
} from "@/lib/meeting-brief";

export const maxDuration = 60;

interface GoogleEventDetail {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { email?: string; displayName?: string; self?: boolean; resource?: boolean }[];
}

const MAX_ATTENDEES = 10;
const EMAIL_RE = /^[^\s@<>()"]+@[^\s@<>()"]+\.[^\s@<>()"]+$/;

/**
 * POST /api/ai/meeting-brief { eventId } — a short brief before a meeting:
 * who is coming (from Contacts), related projects and open tasks, recent
 * emails with the attendees, and suggested talking points. Read-only.
 */
export async function POST(req: NextRequest) {
  if (!pythonLlmConfigured()) {
    return NextResponse.json({ error: "missing_llm_url", message: "The AI isn't configured." }, { status: 500 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const userId = session.user.id;

  const body: unknown = await req.json().catch(() => null);
  const eventId = (body as { eventId?: unknown } | null)?.eventId;
  if (typeof eventId !== "string" || eventId.length === 0 || eventId.length > 1024) {
    return NextResponse.json({ error: "invalid_input", message: "Pick a meeting first." }, { status: 400 });
  }

  const calendar = await getGoogleAccessToken(userId, "calendar");
  if (!calendar.accessToken) {
    return NextResponse.json({ error: "no_calendar", message: "Connect Google Calendar first." }, { status: 401 });
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
      { headers: { Authorization: `Bearer ${calendar.accessToken}` }, cache: "no-store" }
    );
    if (!res.ok) {
      console.error("Meeting brief: calendar event fetch failed", res.status);
      return NextResponse.json(
        { error: "event_not_found", message: "Couldn't load that meeting." },
        { status: res.status === 404 ? 404 : 502 }
      );
    }
    const event = (await res.json()) as GoogleEventDetail;

    const attendees = (event.attendees ?? [])
      .filter((a) => !a.self && !a.resource && a.email && EMAIL_RE.test(a.email))
      .slice(0, MAX_ATTENDEES)
      .map((a) => ({ email: (a.email as string).toLowerCase(), name: a.displayName ?? null }));
    const emails = attendees.map((a) => a.email);

    const scope = await getScope(userId);
    const [contacts, projects] = await Promise.all([
      emails.length
        ? prisma.contact.findMany({
            where: { ...scopeFilter(scope), email: { not: null } },
            select: { name: true, email: true, company: true, role: true, notes: true },
            take: 2000,
          })
        : Promise.resolve([]),
      prisma.project.findMany({
        where: { ...scopeFilter(scope), status: "ACTIVE" },
        select: { id: true, title: true },
        take: 50,
      }),
    ]);

    const byEmail = new Map(contacts.map((c) => [c.email?.trim().toLowerCase() ?? "", c]));
    const people: BriefAttendee[] = attendees.map((a) => {
      const c = byEmail.get(a.email);
      return {
        email: a.email,
        name: a.name,
        contact: c ? { name: c.name, company: c.company, role: c.role, notes: c.notes } : null,
      };
    });

    const companies = [
      ...people.map((p) => p.contact?.company).filter((c): c is string => Boolean(c)),
      ...emails.map(companyHint).filter((c): c is string => Boolean(c)),
    ];
    const related = matchProjects(projects, event.summary ?? "", companies);
    const tasks = related.length
      ? await prisma.task.findMany({
          where: { ...taskAccessWhere(scope), projectId: { in: related.map((p) => p.id) }, status: { not: "DONE" } },
          select: { title: true, status: true, dueDate: true, projectId: true },
          orderBy: [{ dueDate: "asc" }],
          take: 15,
        })
      : [];

    // Recent emails with the attendees, if Gmail is connected too. Optional.
    let recent: { from: string; subject: string; date: string; snippet: string }[] = [];
    if (emails.length) {
      const gmail = await getGoogleAccessToken(userId, "gmail");
      if (gmail.accessToken) {
        const who = emails.slice(0, 5).join(" OR ");
        const found = await searchMessages(gmail.accessToken, `{from:(${who}) to:(${who})} newer_than:60d`, 5).catch(
          () => []
        );
        recent = found.map((m) => ({
          from: m.from,
          subject: m.subject,
          date: m.timestamp.slice(0, 10),
          snippet: m.snippet,
        }));
      }
    }

    const startRaw = event.start?.dateTime ?? event.start?.date ?? "";
    const endRaw = event.end?.dateTime ?? null;
    const duration =
      event.start?.dateTime && endRaw
        ? Math.round((new Date(endRaw).getTime() - new Date(event.start.dateTime).getTime()) / 60000)
        : null;

    const system = await buildSystemPromptWithContext(BRIEF_PROMPT, { userId, page: "meetings" });
    const completion = await completeWithPythonLlm({
      system,
      messages: [
        {
          role: "user",
          content: briefUserMessage({
            title: event.summary ?? "(No title)",
            when: startRaw,
            durationMinutes: duration,
            description: event.description ?? "",
            attendees: people,
            projects: related.map((p) => ({
              title: p.title,
              openTasks: tasks
                .filter((t) => t.projectId === p.id)
                .slice(0, 5)
                .map((t) => ({ title: t.title, status: t.status, due: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null })),
            })),
            emails: recent,
          }),
        },
      ],
      maxTokens: 900,
    });

    const brief = parseBrief(completion.text);
    if (!brief) {
      return NextResponse.json({ error: "unparseable", message: "Couldn't write a brief right now. Try again." }, { status: 422 });
    }
    return NextResponse.json({
      brief,
      sources: { contacts: people.filter((p) => p.contact).length, projects: related.length, emails: recent.length },
    });
  } catch (err: unknown) {
    const wait = rateLimitWait(err);
    if (wait !== null) {
      return NextResponse.json({ error: "rate_limited", message: rateLimitMessage(wait), retryAfter: wait }, { status: 429 });
    }
    console.error("Meeting brief failed:", err);
    return NextResponse.json({ error: "brief_failed", message: "Couldn't write a brief right now." }, { status: 502 });
  }
}
