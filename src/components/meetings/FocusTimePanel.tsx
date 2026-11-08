"use client";

import { useMemo, useState } from "react";
import { Loader2, Timer } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { FOCUS_TITLE, findFocusSlots, type CalendarItem } from "@/lib/calendar";

function slotLabel(start: Date, end: Date): string {
  const day = start.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  const t = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${day}, ${t(start)}–${t(end)}`;
}

/**
 * Suggests free 90+ minute blocks in working hours (the browser's timezone)
 * and puts one on the user's Google Calendar with one click.
 */
export function FocusTimePanel({ events, onBlocked }: { events: CalendarItem[]; onBlocked: () => void }) {
  const slots = useMemo(() => findFocusSlots(events, new Date()), [events]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function block(start: Date, end: Date) {
    const key = start.toISOString();
    setBusy(key);
    setMessage(null);
    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: FOCUS_TITLE,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          description: "Blocked by Vyris for deep work.",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setMessage(data.message ?? "Couldn't add it to your calendar.");
        return;
      }
      setMessage(`Blocked ${slotLabel(start, end)}.`);
      onBlocked();
    } catch {
      setMessage("Couldn't reach Google Calendar.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel className="p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Timer className="w-4 h-4 text-brass" strokeWidth={1.75} />
        <h2 className="font-display text-lg">Focus time</h2>
      </div>
      {slots.length === 0 ? (
        <p className="text-sm text-muted">No free 90-minute block in working hours over the next five weekdays.</p>
      ) : (
        <>
          <p className="text-xs text-muted">Free blocks in your working hours. Block one before meetings fill it.</p>
          <ul className="divide-y divide-line">
            {slots.map((s) => (
              <li key={s.start.toISOString()} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm">{slotLabel(s.start, s.end)}</span>
                <button
                  onClick={() => void block(s.start, s.end)}
                  disabled={busy !== null}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brass text-white disabled:opacity-50"
                >
                  {busy === s.start.toISOString() && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Block it
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {message && (
        <p className="text-xs text-muted" role="status">
          {message}
        </p>
      )}
    </Panel>
  );
}
