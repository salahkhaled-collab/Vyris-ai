import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getGoogleAccessToken } from "@/lib/google-token";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "not_authenticated", message: "Sign in with Google to add events." },
      { status: 401 }
    );
  }

  const { accessToken, error } = await getGoogleAccessToken(session.user.id);

  if (!accessToken) {
    const message =
      error === "no_refresh_token" || error === "refresh_failed"
        ? "Your Google session expired. Please sign in again."
        : "Connect Google Calendar to add events.";
    return NextResponse.json({ error: error ?? "not_authenticated", message }, { status: 401 });
  }

  const body = await req.json();
  const { title, startTime, endTime, allDay, description } = body;

  if (!title || !startTime) {
    return NextResponse.json(
      { error: "invalid_input", message: "Title and start time are required." },
      { status: 400 }
    );
  }

  const eventBody = allDay
    ? {
        summary: title,
        description,
        start: { date: startTime.slice(0, 10) },
        end: { date: (endTime ?? startTime).slice(0, 10) },
      }
    : {
        summary: title,
        description,
        start: { dateTime: startTime },
        end: { dateTime: endTime ?? startTime },
      };

  try {
    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Google Calendar insert error:", res.status, errBody);

      if (res.status === 403) {
        return NextResponse.json(
          {
            error: "insufficient_scope",
            message: "Reconnect Google Calendar to enable adding events.",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: "calendar_api_error", message: "Could not create the event." },
        { status: 502 }
      );
    }

    const created = await res.json();
    return NextResponse.json({ event: created });
  } catch (err) {
    console.error("Failed to create calendar event:", err);
    return NextResponse.json(
      { error: "insert_failed", message: "Could not reach Google Calendar." },
      { status: 500 }
    );
  }
}