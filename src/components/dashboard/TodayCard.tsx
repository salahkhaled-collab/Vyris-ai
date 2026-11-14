"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Inbox, Loader2, Sun, TrendingDown } from "lucide-react";
import type { MorningBrief } from "@/lib/morning-brief";

const timeIn = (iso: string, tz: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: tz });
  } catch {
    return "";
  }
};

/** Today at a glance: the same brief the morning email sends. */
export function TodayCard() {
  const [data, setData] = useState<{ brief: MorningBrief; timeZone: string; inbox?: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [inboxState, setInboxState] = useState<"idle" | "loading" | "done">("idle");

  useEffect(() => {
    let active = true;
    fetch("/api/brief", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => active && setData(d))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);

  async function loadInbox() {
    setInboxState("loading");
    try {
      const r = await fetch("/api/brief?inbox=1", { cache: "no-store" });
      if (r.ok) setData(await r.json());
    } finally {
      setInboxState("done");
    }
  }

  if (failed || !data) return null;
  const { brief, timeZone, inbox } = data;

  return (
    <section aria-label="Today" className="mb-6 rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sun className="w-4 h-4 text-brass" strokeWidth={1.75} />
        <h2 className="font-display text-xl">Today</h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted mb-2">Focus</div>
          {brief.allClear ? (
            <p className="text-sm text-muted">Nothing is blocked or late. A good day to get ahead.</p>
          ) : brief.focus.length ? (
            <ol className="space-y-2.5">
              {brief.focus.map((f, i) => (
                <li key={i} className="flex gap-2.5 min-w-0">
                  <span className="w-5 h-5 shrink-0 rounded-full bg-brass text-white text-[11px] flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm break-words" dir="auto">{f.title}</div>
                    <div className="text-xs text-muted break-words" dir="auto">{f.why}</div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">Nothing urgent. Work on what moves the business.</p>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          {brief.meetings && (
            <div>
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-muted mb-2">
                <CalendarClock className="w-3.5 h-3.5" strokeWidth={1.75} /> Meetings
              </div>
              {brief.meetings.length ? (
                <ul className="space-y-1.5">
                  {brief.meetings.slice(0, 5).map((m, i) => (
                    <li key={i} className="text-sm break-words">
                      <span className="text-muted">{m.allDay ? "All day" : timeIn(m.start, timeZone)}</span> <bdi>{m.title}</bdi>
                      {m.project && <span className="text-xs text-muted"> · {m.project}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No meetings today.</p>
              )}
            </div>
          )}

          {brief.changes.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-muted mb-2">
                <TrendingDown className="w-3.5 h-3.5" strokeWidth={1.75} /> What changed
              </div>
              <ul className="space-y-1.5">
                {brief.changes.map((c) => (
                  <li key={c.metric} className="text-sm break-words">
                    {c.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-muted mb-2">
              <Inbox className="w-3.5 h-3.5" strokeWidth={1.75} /> Waiting on your reply
            </div>
            {brief.unanswered ? (
              brief.unanswered.length ? (
                <ul className="space-y-1.5">
                  {brief.unanswered.slice(0, 5).map((u) => (
                    <li key={u.threadId} className="text-sm break-words">
                      <bdi>{u.from}</bdi>: <bdi>{u.subject}</bdi> <span className="text-xs text-muted">· {u.daysWaiting} days</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Nobody is waiting on you.</p>
              )
            ) : inboxState === "done" && inbox === "not_connected" ? (
              <p className="text-sm text-muted">
                Connect Gmail on the <Link href="/inbox" className="underline">Inbox</Link> page to see this.
              </p>
            ) : inboxState === "done" && inbox === "failed" ? (
              <p className="text-sm text-muted">
                Couldn&apos;t check your inbox just now.{" "}
                <button onClick={() => void loadInbox()} className="underline">
                  Try again
                </button>
              </p>
            ) : (
              <button
                onClick={() => void loadInbox()}
                disabled={inboxState === "loading"}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-line hover:bg-panel-2 disabled:opacity-50"
              >
                {inboxState === "loading" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Check my inbox
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-muted mt-4">
        The same brief arrives by email each morning when the morning brief rule is on (AI &amp; Automation).
      </p>
    </section>
  );
}
