"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Bell, Check, TrendingDown, X } from "lucide-react";
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

const browserZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

/** "Good evening, Salah" and the date, for the page header. */
export function useGreeting(): { title: string; date: string } {
  const { data: session } = useSession();
  const now = new Date();
  const tz = browserZone();
  const name = firstName(session?.user?.name);
  return { title: `${greeting(now, tz)}${name ? `, ${name}` : ""}`, date: dateLabel(now, tz) };
}

/** Today's brief: fast first (tasks, meetings), then again with the inbox (about a dozen Gmail reads). */
function useBrief() {
  const [data, setData] = useState<BriefData | null>(null);
  const [failed, setFailed] = useState(false);
  const [inboxLoaded, setInboxLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/brief", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: BriefData) => {
        if (!active) return;
        setData(d);
        return fetch("/api/brief?inbox=1", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((d2: BriefData | null) => {
            if (!active) return;
            if (d2) setData(d2);
            setInboxLoaded(true);
          });
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);
  return { data, failed, inboxLoaded };
}

/** Ticks on today's 3 things, kept on this device and reset each day. */
function useDone(today: string) {
  const [done, setDone] = useState<Set<number>>(new Set());
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(doneKey(today));
      setDone(new Set(raw ? (JSON.parse(raw) as number[]) : []));
    } catch {
      setDone(new Set());
    }
  }, [today]);
  const toggle = (i: number) =>
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
  return { done, toggle };
}

const NUDGE_KEY = "vyris.today.pushNudgeHidden";

/** "Get this every morning" — only where notifications can work and aren't on yet. */
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
        <div className="text-[13px] font-medium">Get this every morning</div>
        <div className="text-xs text-muted">A notification at the time you pick, not another email.</div>
      </div>
      <PushToggle compact onEnabled={() => window.setTimeout(hide, 1500)} />
      <button onClick={hide} aria-label="Not now" className="p-1 rounded hover:bg-black/[0.06] shrink-0">
        <X className="w-4 h-4 text-muted" strokeWidth={1.75} />
      </button>
    </section>
  );
}

function FocusCard({ brief, done, toggle }: { brief: MorningBrief; done: Set<number>; toggle: (i: number) => void }) {
  const doneCount = [...done].filter((i) => i < brief.focus.length).length;
  return (
    <section aria-label="Today" className="rounded-[20px] border border-line bg-panel pt-4 pb-2">
      <div className="px-4 lg:px-5 pb-1">
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
            : `From your inbox, calendar and projects${doneCount ? ` · ${doneCount} done` : ""}`}
        </p>
      </div>
      {brief.focus.length > 0 && (
        <ul>
          {brief.focus.map((f, i) => {
            const isDone = done.has(i);
            return (
              <li key={`${i}-${f.title}`} className="flex items-start gap-3 px-4 lg:px-5 py-2.5">
                <button
                  onClick={() => toggle(i)}
                  aria-label={isDone ? `Mark "${f.title}" not done` : `Mark "${f.title}" done`}
                  aria-pressed={isDone}
                  className={cn(
                    "w-[22px] h-[22px] mt-px shrink-0 rounded-full flex items-center justify-center",
                    isDone ? "bg-signal text-white" : "border-[1.5px] border-brass hover:bg-brass-soft"
                  )}
                >
                  {isDone && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                </button>
                <div className="min-w-0 flex-1">
                  <div dir="auto" className={cn("text-[15px] font-semibold leading-[21px] break-words", isDone && "line-through text-muted")}>
                    {f.title}
                  </div>
                  <span dir="auto" className={cn("inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full", chip[isDone ? "signal" : focusTone(f.kind)])}>
                    {isDone ? "Done" : f.why}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {brief.changes.length > 0 && (
        <div className="mx-4 lg:mx-5 mt-1 mb-2.5 pt-3 border-t border-line">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-muted mb-1.5">
            <TrendingDown className="w-3.5 h-3.5" strokeWidth={1.75} /> What changed
          </div>
          <ul className="space-y-1">
            {brief.changes.map((c) => (
              <li key={c.metric} className="text-sm break-words">
                {c.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function MeetingCard({ brief, tz, now }: { brief: MorningBrief; tz: string; now: Date }) {
  const meeting = nextMeeting(brief.meetings, now);
  if (!meeting) {
    if (brief.meetings === null) return null;
    return (
      <section aria-label="Next meeting" className="rounded-[20px] border border-line bg-panel p-4 text-sm text-muted">
        No more meetings today.
      </section>
    );
  }
  const [t, ap] = timeParts(meeting.start, tz);
  return (
    <section aria-label="Next meeting" className="rounded-[20px] border border-line bg-panel p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-[52px] h-[52px] shrink-0 rounded-[14px] bg-brass-soft text-brass flex flex-col items-center justify-center">
          <span className="text-[13px] font-medium leading-4">{t}</span>
          <span className="text-[10px] font-medium leading-3">{ap}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold truncate">
            Next: <bdi>{meeting.title}</bdi>
          </div>
          <div className="text-xs text-muted">
            {meeting.attendees.length > 0 ? `${meeting.attendees.length} ${meeting.attendees.length === 1 ? "guest" : "guests"}` : "Just you"}
            {meeting.project && (
              <>
                {" · "}
                <bdi>{meeting.project}</bdi>
              </>
            )}
            {" · "}
            {startsIn(meeting.start, now)}
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
  );
}

/** Who is waiting on a reply: three cards on a phone, a list on desktop. */
function Waiting({ data, inboxLoaded, variant }: { data: BriefData; inboxLoaded: boolean; variant: "phone" | "desktop" }) {
  const waiting = data.brief.unanswered;
  const header = (
    <div className="flex items-center justify-between">
      <h2 className="font-display font-semibold text-[17px]">Waiting on your reply</h2>
      {waiting && waiting.length > 0 && (
        <Link href="/inbox" className="text-[13px] font-medium text-brass">
          See all
        </Link>
      )}
    </div>
  );
  if (!waiting) {
    if (variant === "phone") return null;
    return (
      <section aria-label="Waiting on your reply" className="rounded-[20px] border border-line bg-panel p-4 space-y-2">
        {header}
        <p className="text-sm text-muted">
          {!inboxLoaded ? (
            "Checking your inbox…"
          ) : data.inbox === "not_connected" ? (
            <>
              Connect Gmail on the{" "}
              <Link href="/inbox" className="underline">
                Inbox
              </Link>{" "}
              page to see who&apos;s waiting.
            </>
          ) : (
            "Couldn't check your inbox just now."
          )}
        </p>
      </section>
    );
  }
  if (variant === "phone") {
    if (waiting.length === 0) return null;
    return (
      <section aria-label="Waiting on your reply" className="space-y-2.5">
        {header}
        <div className="grid grid-cols-3 gap-2">
          {waiting.slice(0, 3).map((u) => {
            const who = senderName(u.from);
            return (
              <Link key={u.threadId} href="/inbox" className="rounded-2xl border border-line bg-panel p-3 space-y-1.5 min-w-0">
                <span className="w-8 h-8 rounded-full bg-panel-2 text-brass text-xs flex items-center justify-center">{initials(who)}</span>
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
    );
  }
  return (
    <section aria-label="Waiting on your reply" className="rounded-[20px] border border-line bg-panel p-4 space-y-2">
      {header}
      {waiting.length === 0 ? (
        <p className="text-sm text-muted">Nobody is waiting on you.</p>
      ) : (
        <ul className="divide-y divide-line">
          {waiting.slice(0, 5).map((u) => {
            const who = senderName(u.from);
            return (
              <li key={u.threadId}>
                <Link href="/inbox" className="flex items-center gap-3 py-2.5 hover:opacity-80">
                  <span className="w-8 h-8 shrink-0 rounded-full bg-panel-2 text-brass text-xs flex items-center justify-center">{initials(who)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium truncate" dir="auto">
                      {who}
                    </span>
                    <span className="block text-xs text-muted truncate" dir="auto">
                      {u.subject}
                    </span>
                  </span>
                  <span className="text-xs text-muted whitespace-nowrap">
                    {u.daysWaiting} day{u.daysWaiting === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * Home, led by the morning brief: the 3 things that matter (tick them off),
 * the next meeting, who is waiting on a reply. On a phone it's the whole
 * screen with its own greeting; on desktop it's the top of Home, beside the
 * sidebar, with the page header carrying the greeting.
 */
export function TodayView({
  variant,
  children,
  below,
}: {
  variant: "phone" | "desktop";
  children?: React.ReactNode;
  /** Desktop: shown under the 3 things, so the two columns end close together. */
  below?: React.ReactNode;
}) {
  const { data: session } = useSession();
  const { data, failed, inboxLoaded } = useBrief();
  const now = new Date();
  const tz = data?.timeZone ?? browserZone();
  const { done, toggle } = useDone(dayIn(now, tz));
  const name = firstName(session?.user?.name);
  const brief = data?.brief;

  const status = (
    <>
      {failed && <p className="text-sm text-muted">Couldn&apos;t load today&apos;s brief. Refresh to try again.</p>}
      {!brief && !failed && <div className="h-48 rounded-[20px] border border-line bg-panel animate-pulse" aria-label="Loading" />}
    </>
  );

  if (variant === "desktop") {
    return (
      <div className="space-y-4 mb-4">
        {children}
        {status}
        {brief && data && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
            <div className="space-y-4 min-w-0 [&>section]:mb-0">
              <FocusCard brief={brief} done={done} toggle={toggle} />
              {below}
            </div>
            <div className="space-y-4 min-w-0">
              <MeetingCard brief={brief} tz={tz} now={now} />
              <Waiting data={data} inboxLoaded={inboxLoaded} variant="desktop" />
              <PushNudge />
            </div>
          </div>
        )}
        {!(brief && data) && below}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start gap-3 pt-1">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold tracking-[0.05em] text-muted">{dateLabel(now, tz)}</div>
          <h1 className="font-display text-[30px] leading-9">
            {greeting(now, tz)}
            {name && (
              <>
                , <bdi>{name}</bdi>
              </>
            )}
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
      {status}
      {brief && data && (
        <>
          <FocusCard brief={brief} done={done} toggle={toggle} />
          <MeetingCard brief={brief} tz={tz} now={now} />
          <Waiting data={data} inboxLoaded={inboxLoaded} variant="phone" />
        </>
      )}
      <PushNudge />
    </div>
  );
}
