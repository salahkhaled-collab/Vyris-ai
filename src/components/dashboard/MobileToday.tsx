"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Bell, Check, X } from "lucide-react";
import type { MorningBrief } from "@/lib/morning-brief";
import { dateLabel, doneKey, firstName, focusTone, greeting, initials, nextMeeting, senderName, startsIn, type Tone } from "@/lib/today-view";
import { dayIn } from "@/lib/commitments";
import { openAskVyris } from "@/lib/ask-vyris";
import { pushSupport, currentEndpoint } from "@/lib/push-client";
import { PushToggle } from "@/components/notifications/PushToggle";
import { cn } from "@/lib/utils";

type BriefData = { brief: MorningBrief; timeZone: string; inbox?: string };

const chip: Record<Tone, string> = {
  brand: "bg-brass-soft text-brass",
  warn: "bg-[#f6e9dc] text-[#a4561b]",
  neutral: "bg-panel-2 text-muted",
  signal: "bg-signal/10 text-signal",
};

const timeParts = (iso: string, tz: string): [string, string] => {
  try {
    const s = new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
    const [t, ap] = s.split(" ");
    return [t, ap ?? ""];
  } catch {
    return ["", ""];
  }
};

const NUDGE_KEY = "vyris.today.pushNudgeHidden";

/** "Get this at 7:00" — only where notifications can work and aren't on yet. */
function PushNudge() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let active = true;
    try {
      if (window.localStorage.getItem(NUDGE_KEY) === "1") return;
    } catch {
      // storage unavailable: just ask
    }
    if (pushSupport() === "unsupported") return;
    Promise.all([fetch("/api/push", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)), currentEndpoint().catch(() => null)])
      .then(([d, ep]: [{ publicKey: string | null; devices: { endpoint: string }[] } | null, string | null]) => {
        if (!active || !d?.publicKey) return;
        if (ep && d.devices.some((x) => x.endpoint === ep)) return;
        setShow(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  if (!show) return null;
  const hide = () => {
    try {
      window.localStorage.setItem(NUDGE_KEY, "1");
    } catch {
      // ignore
    }
    setShow(false);
  };
  return (
    <section aria-label="Morning notification" className="rounded-[20px] bg-brass-soft px-4 py-3.5 flex flex-wrap items-center gap-3">
      <Bell className="w-5 h-5 text-brass shrink-0" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium">Get this at 7:00 every morning</div>
        <div className="text-xs text-muted">A notification, not another email.</div>
      </div>
      <PushToggle compact onEnabled={() => window.setTimeout(hide, 1500)} />
      <button onClick={hide} aria-label="Not now" className="p-1 rounded hover:bg-black/[0.06] shrink-0">
        <X className="w-4 h-4 text-muted" strokeWidth={1.75} />
      </button>
    </section>
  );
}

/**
 * Home on a phone: the morning brief is the screen. The 3 things that matter
 * (tick them off), the next meeting, who is waiting on a reply.
 */
export function MobileToday({ children }: { children?: React.ReactNode }) {
  const { data: session } = useSession();
  const [data, setData] = useState<BriefData | null>(null);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState<Set<number>>(new Set());
  const now = new Date();
  const tz = data?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  const today = dayIn(now, tz);

  useEffect(() => {
    let active = true;
    // Fast first (tasks, meetings), then again with the inbox (a dozen Gmail calls).
    fetch("/api/brief", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: BriefData) => {
        if (!active) return;
        setData(d);
        return fetch("/api/brief?inbox=1", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((d2: BriefData | null) => active && d2 && setData(d2));
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(doneKey(today));
      setDone(new Set(raw ? (JSON.parse(raw) as number[]) : []));
    } catch {
      setDone(new Set());
    }
  }, [today]);

  function toggle(i: number) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      try {
        window.localStorage.setItem(doneKey(today), JSON.stringify([...next]));
      } catch {
        // ticks just won't survive a reload
      }
      return next;
    });
  }

  const name = firstName(session?.user?.name);
  const brief = data?.brief;
  const meeting = brief ? nextMeeting(brief.meetings, now) : null;
  const waiting = brief?.unanswered ?? null;

  return (
    <div className="space-y-4">
      <header className="flex items-start gap-3 pt-1">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold tracking-[0.05em] text-muted">{dateLabel(now, tz)}</div>
          <h1 className="font-display text-[30px] leading-9">
            {greeting(now, tz)}
            {name && <>, <bdi>{name}</bdi></>}
          </h1>
        </div>
        <Link
          href="/settings"
          aria-label="Notifications and settings"
          className="w-10 h-10 shrink-0 rounded-full border border-line bg-panel flex items-center justify-center"
        >
          <Bell className="w-5 h-5" strokeWidth={1.75} />
        </Link>
      </header>

      {children}

      {failed && <p className="text-sm text-muted">Couldn&apos;t load today&apos;s brief. Pull down to refresh.</p>}
      {!brief && !failed && <div className="h-48 rounded-[20px] border border-line bg-panel animate-pulse" aria-label="Loading" />}

      {brief && (
        <section aria-label="Today" className="rounded-[20px] border border-line bg-panel pt-4 pb-1.5">
          <div className="px-4 pb-1.5">
            <h2 className="font-display text-[22px] leading-7">
              {brief.allClear
                ? "A clear day"
                : brief.focus.length
                  ? `${brief.focus.length} thing${brief.focus.length === 1 ? "" : "s"} that matter today`
                  : "Nothing urgent today"}
            </h2>
            <p className="text-xs text-muted">
              {brief.allClear || !brief.focus.length
                ? "Nothing is blocked or late. A good day to get ahead."
                : `From your inbox, calendar and projects${done.size ? ` · ${[...done].filter((i) => i < brief.focus.length).length} done` : ""}`}
            </p>
          </div>
          {brief.focus.length > 0 && (
            <ul>
              {brief.focus.map((f, i) => {
                const isDone = done.has(i);
                return (
                  <li key={`${i}-${f.title}`} className="flex items-start gap-3 px-4 py-3.5">
                    <button
                      onClick={() => toggle(i)}
                      aria-label={isDone ? `Mark "${f.title}" not done` : `Mark "${f.title}" done`}
                      aria-pressed={isDone}
                      className={cn(
                        "w-[22px] h-[22px] mt-px shrink-0 rounded-full flex items-center justify-center",
                        isDone ? "bg-signal text-white" : "border-[1.5px] border-brass"
                      )}
                    >
                      {isDone && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div dir="auto" className={cn("text-[15px] font-semibold leading-[21px] break-words", isDone && "line-through text-muted")}>
                        {f.title}
                      </div>
                      <span dir="auto" className={cn("inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full", chip[isDone ? "signal" : focusTone(f.kind)])}>
                        {isDone ? "Done" : f.why}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {meeting && (
        <section aria-label="Next meeting" className="rounded-[20px] border border-line bg-panel p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-[52px] h-[52px] shrink-0 rounded-[14px] bg-brass-soft text-brass flex flex-col items-center justify-center">
              <span className="text-[13px] font-medium leading-4">{timeParts(meeting.start, tz)[0]}</span>
              <span className="text-[10px] font-medium leading-3">{timeParts(meeting.start, tz)[1]}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold truncate">
                Next: <bdi>{meeting.title}</bdi>
              </div>
              <div className="text-xs text-muted">
                {meeting.attendees.length > 0
                  ? `${meeting.attendees.length} ${meeting.attendees.length === 1 ? "guest" : "guests"}`
                  : "Just you"}
                {meeting.project && <> · <bdi>{meeting.project}</bdi></>} · {startsIn(meeting.start, now)}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => openAskVyris({ prompt: `Prep me for my meeting "${meeting.title}"` })}
              className="text-[13px] font-medium px-3.5 py-2 rounded-full bg-brass text-white"
            >
              Prep me
            </button>
            <Link href="/calendar" className="text-[13px] font-medium px-3.5 py-2 rounded-full border border-line bg-panel">
              Open calendar
            </Link>
          </div>
        </section>
      )}

      {waiting && waiting.length > 0 && (
        <section aria-label="Waiting on your reply" className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-[17px]">Waiting on your reply</h2>
            <Link href="/inbox" className="text-[13px] font-medium text-brass">
              See all
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {waiting.slice(0, 3).map((u) => {
              const who = senderName(u.from);
              return (
                <Link key={u.threadId} href="/inbox" className="rounded-2xl border border-line bg-panel p-3 space-y-1.5 min-w-0">
                  <span className="w-8 h-8 rounded-full bg-panel-2 text-brass text-xs flex items-center justify-center">
                    {initials(who)}
                  </span>
                  <div className="text-[13px] font-medium truncate" dir="auto">
                    {who.split(/\s+/)[0]}
                  </div>
                  <div className="text-xs text-muted">
                    {u.daysWaiting} day{u.daysWaiting === 1 ? "" : "s"}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <PushNudge />
    </div>
  );
}
