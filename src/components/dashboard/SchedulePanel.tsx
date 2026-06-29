"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { Panel } from "@/components/ui/Panel";
import { todaysSchedule as mockSchedule } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

interface CalendarEvent {
  id: string;
  time: string;
  title: string;
  meta: string;
}

export function SchedulePanel() {
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;

    let active = true;
    setLoading(true);
    fetch("/api/calendar")
      .then(async (res) => {
        const data = await res.json();
        if (!active) return;
        if (!res.ok) {
          setError(data.message ?? "Could not load calendar.");
          setEvents(null);
        } else {
          setEvents(data.events);
          setError(null);
        }
      })
      .catch(() => {
        if (active) setError("Could not reach Google Calendar.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [status]);

  // Not signed in — show mock data with a connect prompt
  if (status !== "authenticated") {
    return (
      <Panel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl">Today&apos;s Schedule</h3>
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted px-2 py-1 rounded-full bg-panel-2">
            Preview
          </span>
        </div>
        <div className="space-y-4 opacity-50">
          {mockSchedule.map((s) => (
            <div key={s.id} className="flex gap-3">
              <div className="font-mono text-xs pt-0.5 w-12 text-muted">{s.time}</div>
              <div
                className={cn(
                  "flex-1 border-l pl-3",
                  s.highlight ? "border-brass" : "border-line"
                )}
              >
                <div className="text-sm font-medium">{s.title}</div>
                <div className="text-xs text-muted">{s.meta}</div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => signIn("google")}
          className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-brass text-[#1a140a]"
        >
          <Calendar className="w-4 h-4" strokeWidth={2} />
          Connect Google Calendar
        </button>
      </Panel>
    );
  }

  // Authenticated — show real data
  return (
    <Panel className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-xl">Today&apos;s Schedule</h3>
        {session?.user?.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt={session.user.name ?? "Account"}
            className="w-6 h-6 rounded-full"
          />
        )}
      </div>

      {loading && <div className="text-sm text-muted py-4">Loading your calendar...</div>}

      {error && (
        <div className="text-sm text-muted py-2">
          {error}{" "}
          <button onClick={() => signIn("google")} className="text-brass underline">
            Reconnect
          </button>
        </div>
      )}

      {!loading && !error && events && events.length === 0 && (
        <div className="text-sm text-muted py-4">Nothing on your calendar today.</div>
      )}

      {!loading && !error && events && events.length > 0 && (
        <div className="space-y-4">
          {events.map((e) => (
            <div key={e.id} className="flex gap-3">
              <div className="font-mono text-xs pt-0.5 w-16 text-muted">{e.time}</div>
              <div className="flex-1 border-l border-line pl-3">
                <div className="text-sm font-medium">{e.title}</div>
                {e.meta && <div className="text-xs text-muted">{e.meta}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
