import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getGoogleAccessToken } from "@/lib/google-token";

interface GoogleEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { email: string }[];
  hangoutLink?: string;
  description?: string;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "not_authenticated", message: "Sign in with Google to load your calendar." },
      { status: 401 }
    );
  }

  const { accessToken, error } = await getGoogleAccessToken(session.user.id);

  if (!accessToken) {
    const message =
      error === "no_refresh_token" || error === "refresh_failed"
        ? "Your Google session expired. Please sign in again."
        : "Connect Google Calendar to see your schedule.";
    return NextResponse.json({ error: error ?? "not_authenticated", message }, { status: 401 });
  }

  // range=today (default, dashboard) | week (Meetings) | month (Calendar grid)
  const rangeParam = req.nextUrl.searchParams.get("range");
  const range = rangeParam === "week" || rangeParam === "month" ? rangeParam : "today";

  const now = new Date();
  let startOfDay: Date;
  let rangeEnd: Date;

  if (range === "month") {
    // Grid covers the full calendar month containing today, padded to
    // start on a Sunday and end on a Saturday so the UI renders clean weeks.
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    startOfDay = new Date(monthStart);
    startOfDay.setDate(startOfDay.getDate() - startOfDay.getDay());
    startOfDay.setHours(0, 0, 0, 0);
    rangeEnd = new Date(monthEnd);
    rangeEnd.setDate(rangeEnd.getDate() + (6 - rangeEnd.getDay()));
    rangeEnd.setHours(23, 59, 59, 999);
  } else {
    startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    rangeEnd = new Date(startOfDay);
    if (range === "week") {
      rangeEnd.setDate(rangeEnd.getDate() + 7);
    } else {
      rangeEnd.setHours(23, 59, 59, 999);
    }
  }

  const params = new URLSearchParams({
    timeMin: startOfDay.toISOString(),
    timeMax: rangeEnd.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: range === "month" ? "250" : range === "week" ? "50" : "20",
  });

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error("Google Calendar API error:", res.status, body);
      return NextResponse.json(
        { error: "calendar_api_error", message: "Could not load calendar events." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const events: GoogleEvent[] = data.items ?? [];

    const formatted = events.map((e) => {
      const startRaw = e.start?.dateTime ?? e.start?.date;
      const allDay = !e.start?.dateTime;
      const time = allDay
        ? "All day"
        : startRaw
        ? new Date(startRaw).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";

      const attendeeCount = e.attendees?.length ?? 0;
      const metaParts: string[] = [];
      if (e.end?.dateTime && e.start?.dateTime) {
        const mins = Math.round(
          (new Date(e.end.dateTime).getTime() - new Date(e.start.dateTime).getTime()) / 60000
        );
        metaParts.push(`${mins} min`);
      }
      if (attendeeCount > 0) metaParts.push(`${attendeeCount} attendee${attendeeCount > 1 ? "s" : ""}`);
      if (e.hangoutLink) metaParts.push("Video call");

      return {
        id: e.id,
        date: startRaw ?? null, // full ISO date, used by Meetings to group by day
        time,
        title: e.summary ?? "(No title)",
        meta: metaParts.join(" · "),
        attendees: e.attendees?.map((a) => a.email) ?? [],
        videoLink: e.hangoutLink ?? null,
      };
    });

    return NextResponse.json({ events: formatted });
  } catch (err) {
    console.error("Failed to fetch calendar events:", err);
    return NextResponse.json(
      { error: "fetch_failed", message: "Could not reach Google Calendar." },
      { status: 500 }
    );
  }
}
