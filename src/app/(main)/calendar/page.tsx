"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

interface CalEvent {
  id: string;
  date: string | null;
  time: string;
  title: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const { status } = useSession();
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    setLoading(true);
    // Note: always fetches the current month's range from the API
    // (server computes "this month"). For simplicity this demo always
    // shows the current month — prev/next just navigate visually within
    // the fetched window; wiring true cross-month navigation would mean
    // passing an explicit month param to the API.
    fetch("/api/calendar?range=month")
      .then(async (res) => {
        const data = await res.json();
        if (!active) return;
        if (!res.ok) {
          setError(data.message ?? "Could not load your calendar.");
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

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthStart = new Date(year, month, 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  const days: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const eventsByDay = events.reduce<Record<string, CalEvent[]>>((acc, e) => {
    if (!e.date) return acc;
    const key = new Date(e.date).toDateString();
    (acc[key] ??= []).push(e);
    return acc;
  }, {});

  const today = new Date().toDateString();
  const selectedEvents = selectedDay ? eventsByDay[selectedDay] ?? [] : [];

  return (
    <>
      <Topbar eyebrow="Intelligence" title="Calendar" />

      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8 space-y-6">
        {status !== "authenticated" && (
          <Panel className="p-8 text-center">
            <CalendarIcon className="w-8 h-8 text-muted mx-auto mb-3" strokeWidth={1.5} />
            <div className="text-sm font-medium mb-1">Connect Google Calendar</div>
            <div className="text-xs text-muted mb-4">See your month at a glance.</div>
            <button
              onClick={() => signIn("google")}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-brass text-[#1a140a]"
            >
              Connect
            </button>
          </Panel>
        )}

        {status === "authenticated" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">
                {cursor.toLocaleDateString([], { month: "long", year: "numeric" })}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCursor(new Date(year, month - 1, 1))}
                  className="p-2 rounded-lg bg-panel-2 hover:bg-white/[0.05]"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
                </button>
                <button
                  onClick={() => setCursor(new Date())}
                  className="px-3 py-2 rounded-lg text-xs bg-panel-2 hover:bg-white/[0.05]"
                >
                  Today
                </button>
                <button
                  onClick={() => setCursor(new Date(year, month + 1, 1))}
                  className="p-2 rounded-lg bg-panel-2 hover:bg-white/[0.05]"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
            </div>

            {loading && <div className="text-sm text-muted py-8 text-center">Loading...</div>}
            {error && (
              <Panel className="p-6 text-sm text-muted">
                {error}{" "}
                <button onClick={() => signIn("google")} className="text-brass underline">
                  Reconnect
                </button>
              </Panel>
            )}

            {!loading && !error && (
              <Panel className="overflow-hidden">
                <div className="grid grid-cols-7 border-b border-line">
                  {WEEKDAYS.map((d) => (
                    <div key={d} className="px-3 py-2 text-center text-[11px] uppercase tracking-[0.1em] text-muted">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {days.map((day) => {
                    const key = day.toDateString();
                    const inMonth = day.getMonth() === month;
                    const dayEvents = eventsByDay[key] ?? [];
                    const isToday = key === today;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedDay(key)}
                        className={cn(
                          "min-h-[88px] border-b border-r border-line p-2 text-left transition-colors hover:bg-white/[0.02]",
                          !inMonth && "opacity-40",
                          selectedDay === key && "bg-brass-soft"
                        )}
                      >
                        <div
                          className={cn(
                            "text-xs font-mono w-5 h-5 flex items-center justify-center rounded-full",
                            isToday && "bg-brass text-[#1a140a]"
                          )}
                        >
                          {day.getDate()}
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {dayEvents.slice(0, 2).map((e) => (
                            <div key={e.id} className="text-[10px] text-muted truncate">
                              {e.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-[10px] text-brass">+{dayEvents.length - 2} more</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Panel>
            )}

            {selectedDay && (
              <Panel className="p-6">
                <h3 className="font-display text-lg mb-3">
                  {new Date(selectedDay).toLocaleDateString([], {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                {selectedEvents.length === 0 ? (
                  <div className="text-sm text-muted">Nothing scheduled.</div>
                ) : (
                  <div className="space-y-2">
                    {selectedEvents.map((e) => (
                      <div key={e.id} className="flex gap-3 text-sm">
                        <span className="font-mono text-xs text-muted w-16">{e.time}</span>
                        <span>{e.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            )}
          </>
        )}
      </main>
    </>
  );
}
