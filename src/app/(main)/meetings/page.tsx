"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { Calendar, Users, Video } from "lucide-react";

interface MeetingEvent {
  id: string;
  date: string | null;
  time: string;
  title: string;
  meta: string;
  attendees: string[];
  videoLink: string | null;
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

export default function MeetingsPage() {
  const { status } = useSession();
  const [events, setEvents] = useState<MeetingEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    setLoading(true);
    fetch("/api/calendar?range=week")
      .then(async (res) => {
        const data = await res.json();
        if (!active) return;
        if (!res.ok) {
          setError(data.message ?? "Could not load your meetings.");
        } else {
          setEvents(data.events);
          setError(null);
        }
      })
      .catch(() => active && setError("Could not reach Google Calendar."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [status]);

  const grouped = (events ?? []).reduce<Record<string, MeetingEvent[]>>((acc, e) => {
    if (!e.date) return acc;
    const key = new Date(e.date).toDateString();
    (acc[key] ??= []).push(e);
    return acc;
  }, {});

  const orderedKeys = Object.keys(grouped).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <>
      <Topbar
        eyebrow="Operations"
        title="Meetings"
        statusText={events ? `${events.length} this week` : undefined}
      />

      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8 space-y-6">
        {status !== "authenticated" && (
          <Panel className="p-8 text-center">
            <Calendar className="w-8 h-8 text-muted mx-auto mb-3" strokeWidth={1.5} />
            <div className="text-sm font-medium mb-1">Connect Google Calendar</div>
            <div className="text-xs text-muted mb-4">
              See your real meetings for the week, grouped by day.
            </div>
            <button
              onClick={() => signIn("google")}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-brass text-white"
            >
              Connect
            </button>
          </Panel>
        )}

        {status === "authenticated" && loading && (
          <div className="text-sm text-muted py-8 text-center">Loading your meetings...</div>
        )}

        {status === "authenticated" && error && (
          <Panel className="p-6 text-sm text-muted">
            {error}{" "}
            <button onClick={() => signIn("google")} className="text-brass underline">
              Reconnect
            </button>
          </Panel>
        )}

        {status === "authenticated" && !loading && !error && orderedKeys.length === 0 && (
          <Panel className="p-10 text-center text-sm text-muted">
            Nothing on your calendar for the next 7 days.
          </Panel>
        )}

        {status === "authenticated" &&
          !loading &&
          !error &&
          orderedKeys.map((dayKey) => (
            <section key={dayKey} className="space-y-3">
              <h2 className="font-display text-lg text-muted">{dayLabel(dayKey)}</h2>
              <Panel className="overflow-hidden">
                <div className="divide-y divide-line">
                  {grouped[dayKey].map((e) => (
                    <div key={e.id} className="flex items-start gap-4 px-6 py-4">
                      <div className="font-mono text-xs pt-0.5 w-16 text-muted shrink-0">{e.time}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{e.title}</div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                          {e.meta && <span>{e.meta}</span>}
                          {e.attendees.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" strokeWidth={1.75} />
                              {e.attendees.length}
                            </span>
                          )}
                        </div>
                      </div>
                      {e.videoLink && (
                        <a
                          href={e.videoLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-panel-2 hover:bg-black/[0.06] transition-colors"
                        >
                          <Video className="w-3.5 h-3.5" strokeWidth={1.75} />
                          Join
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </Panel>
            </section>
          ))}
      </main>
    </>
  );
}
