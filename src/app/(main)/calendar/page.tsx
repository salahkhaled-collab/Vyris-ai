"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, X } from "lucide-react";

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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formAllDay, setFormAllDay] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchEvents = useCallback(() => {
    setLoading(true);
    fetch("/api/calendar?range=month")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.message ?? "Could not load your calendar.");
        } else {
          setEvents(data.events);
          setError(null);
        }
      })
      .catch(() => setError("Could not reach Google Calendar."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchEvents();
  }, [status, fetchEvents]);

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

  function openAddModal(prefillDate?: string) {
    setFormTitle("");
    setFormAllDay(false);
    setFormStartTime("");
    setFormEndTime("");
    setFormDate(prefillDate ?? new Date().toISOString().slice(0, 10));
    setFormError(null);
    setShowAddModal(true);
  }

  async function handleCreateEvent() {
    if (!formTitle.trim() || !formDate) {
      setFormError("Title and date are required.");
      return;
    }
    async function handleDeleteEvent(eventId: string) {
  setDeletingId(eventId);
  try {
    const res = await fetch(`/api/calendar/events?eventId=${encodeURIComponent(eventId)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.message ?? "Could not delete the event.");
      return;
    }
    setConfirmDeleteId(null);
    fetchEvents();
  } catch {
    setError("Could not reach Google Calendar.");
  } finally {
    setDeletingId(null);
  }
}

    const startTime = formAllDay
      ? formDate
      : `${formDate}T${formStartTime || "09:00"}:00`;
    const endTime = formAllDay
      ? formDate
      : `${formDate}T${formEndTime || formStartTime || "10:00"}:00`;

    setSaving(true);
    setFormError(null);

    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          startTime,
          endTime,
          allDay: formAllDay,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(
          res.status === 403
            ? "Reconnect Google Calendar to add events."
            : data.message ?? "Could not create the event."
        );
        return;
      }

      setShowAddModal(false);
      fetchEvents(); // refetch so the new event shows up on the grid
    } catch {
      setFormError("Could not reach Google Calendar.");
    } finally {
      setSaving(false);
    }
  }

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
              className="px-4 py-2 rounded-lg text-sm font-medium bg-brass text-white"
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
                  className="p-2 rounded-lg bg-panel-2 hover:bg-black/[0.06]"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
                </button>
                <button
                  onClick={() => setCursor(new Date())}
                  className="px-3 py-2 rounded-lg text-xs bg-panel-2 hover:bg-black/[0.06]"
                >
                  Today
                </button>
                <button
                  onClick={() => setCursor(new Date(year, month + 1, 1))}
                  className="p-2 rounded-lg bg-panel-2 hover:bg-black/[0.06]"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
                </button>
                <button
                  onClick={() => openAddModal()}
                  className="ml-2 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-brass text-white hover:bg-brass/90"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                  Add
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
                          "min-h-[88px] border-b border-r border-line p-2 text-left transition-colors hover:bg-black/[0.03]",
                          !inMonth && "opacity-40",
                          selectedDay === key && "bg-brass-soft"
                        )}
                      >
                        <div
                          className={cn(
                            "text-xs font-mono w-5 h-5 flex items-center justify-center rounded-full",
                            isToday && "bg-brass text-white"
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-lg">
                    {new Date(selectedDay).toLocaleDateString([], {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </h3>
                  <button
                    onClick={() => openAddModal(new Date(selectedDay).toISOString().slice(0, 10))}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-panel-2 hover:bg-black/[0.06]"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                    Add
                  </button>
                </div>
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

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <Panel className="w-full max-w-md p-6 relative">
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-black/[0.06]"
                aria-label="Close"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>

              <h3 className="font-display text-lg mb-4">Add event</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted block mb-1">Title</label>
                  <input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-line text-sm"
                    placeholder="Event title"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted block mb-1">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-line text-sm"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={formAllDay}
                    onChange={(e) => setFormAllDay(e.target.checked)}
                  />
                  All day
                </label>

                {!formAllDay && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-muted block mb-1">Start</label>
                      <input
                        type="time"
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-line text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted block mb-1">End</label>
                      <input
                        type="time"
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-line text-sm"
                      />
                    </div>
                  </div>
                )}

                {formError && <div className="text-xs text-red-600">{formError}</div>}

                <button
                  onClick={handleCreateEvent}
                  disabled={saving}
                  className="w-full mt-2 px-4 py-2 rounded-lg text-sm font-medium bg-brass text-white disabled:opacity-50"
                >
                  {saving ? "Adding..." : "Add event"}
                </button>
              </div>
            </Panel>
          </div>
        )}
      </main>
    </>
  );
}