"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Mail, X } from "lucide-react";
import { track } from "@/lib/analytics";
import { GoogleConnectDialog } from "@/components/onboarding/GoogleConnectDialog";
import { INBOX_SEEN_KEY } from "@/components/inbox/InboxWelcome";
import { PushToggle } from "@/components/notifications/PushToggle";
import type { GoogleFeature } from "@/lib/google-scopes";

type Checklist = { gmail: boolean; calendar: boolean; project: boolean; digest: boolean; push?: boolean };
const DISMISS_KEY = "vyris.getStarted.dismissed";

const readFlag = (key: string) => {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

/**
 * The first five minutes, on Home: connect Google once (Gmail + Calendar on
 * one screen, with Google's "unverified app" screen explained first), land on
 * a sorted inbox, then get a morning brief today instead of tomorrow. Each
 * step unlocks the next; the project step is optional.
 */
export function GetStartedCard() {
  const [state, setState] = useState<Checklist | null>(null);
  const [inboxSeen, setInboxSeen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [digestBusy, setDigestBusy] = useState(false);
  const [sendState, setSendState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const closeConnect = useCallback(() => setConnectOpen(false), []);

  useEffect(() => {
    setHidden(readFlag(DISMISS_KEY));
    setInboxSeen(readFlag(INBOX_SEEN_KEY));
    let active = true;
    fetch("/api/onboarding/checklist")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Checklist | null) => active && setState(d))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (hidden || !state) return null;
  const google = state.gmail && state.calendar;
  const briefOn = state.digest || Boolean(state.push);
  const required = [google, state.gmail && inboxSeen, briefOn];
  const done = [...required, state.project].filter(Boolean).length;
  // Stay until the brief has gone out at least once this session, so "Send it now" is reachable.
  if (required.every(Boolean) && state.project && sendState !== "sent") return null;

  const missing: GoogleFeature[] = [...(state.gmail ? [] : ["gmail" as const]), ...(state.calendar ? [] : ["calendar" as const])];

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setHidden(true);
  }

  async function enableDigest() {
    setDigestBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/automation-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Morning brief", trigger: "daily_digest", action: { type: "email_me" } }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message ?? "Couldn't turn on the morning brief.");
      }
      track("digest_enabled");
      setState((s) => (s ? { ...s, digest: true } : s));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't turn on the morning brief.");
    } finally {
      setDigestBusy(false);
    }
  }

  async function sendNow() {
    setSendState("sending");
    setError(null);
    try {
      const res = await fetch("/api/brief/send", { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message ?? "Couldn't send the brief.");
      }
      track("brief_sent_now");
      setSendState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the brief.");
      setSendState("idle");
    }
  }

  const btn = "text-xs font-medium px-3 py-1.5 rounded-lg bg-brass text-white disabled:opacity-50 inline-flex items-center gap-1 whitespace-nowrap";
  const btnQuiet = "text-xs font-medium px-3 py-1.5 rounded-lg border border-line bg-panel-2 disabled:opacity-50 inline-flex items-center gap-1 whitespace-nowrap";

  const steps: { key: string; done: boolean; locked: boolean; title: string; detail: string; action: React.ReactNode }[] = [
    {
      key: "google",
      done: google,
      locked: false,
      title: state.gmail ? "Add Google Calendar" : "Connect Gmail and Calendar",
      detail: state.gmail
        ? "For a short brief before each meeting and a warning when meetings overlap."
        : "One Google screen. Vyris sorts your inbox and reads your day. It never sends without your OK.",
      action: (
        <button
          onClick={() => {
            track("connect_google_click");
            setConnectOpen(true);
          }}
          className={btn}
        >
          Connect
        </button>
      ),
    },
    {
      key: "inbox",
      done: state.gmail && inboxSeen,
      locked: !state.gmail,
      title: "See your sorted inbox",
      detail: "Urgent mail and people waiting on your reply, at the top.",
      action: (
        <Link href="/inbox?welcome=1" className={btn}>
          Open inbox
        </Link>
      ),
    },
    {
      key: "digest",
      done: briefOn,
      locked: !state.gmail,
      title: "Get your morning brief",
      detail: "Each morning: the 3 things that matter today, your meetings, and who is waiting on you. As a notification, or by email.",
      action: (
        <div className="flex flex-wrap items-start gap-2">
          <PushToggle compact onEnabled={() => setState((s) => (s ? { ...s, push: true } : s))} />
          <button onClick={() => void enableDigest()} disabled={digestBusy} className={btnQuiet}>
            {digestBusy && <Loader2 className="w-3 h-3 animate-spin" />}
            By email
          </button>
        </div>
      ),
    },
    {
      key: "project",
      done: state.project,
      locked: false,
      title: "Add a project (optional)",
      detail: "Vyris watches its tasks and tells you what's blocked or overdue.",
      action: (
        <Link href="/projects" className={btnQuiet}>
          Add project
        </Link>
      ),
    },
  ];
  const current = steps.find((s) => !s.done && !s.locked)?.key;

  return (
    <section aria-label="Get started" className="mb-6 rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-display text-xl">Your first five minutes</h2>
          <p className="text-xs text-muted mt-0.5">{done} of 4 done</p>
        </div>
        <button onClick={dismiss} aria-label="Hide the Get started card" className="p-1 rounded hover:bg-black/[0.06]">
          <X className="w-4 h-4 text-muted" strokeWidth={1.75} />
        </button>
      </div>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s.key} className={`flex flex-wrap items-center gap-3 ${s.locked ? "opacity-50" : ""}`}>
            <span
              className={
                s.done
                  ? "w-5 h-5 rounded-full bg-signal text-white flex items-center justify-center shrink-0"
                  : `w-5 h-5 rounded-full border shrink-0 flex items-center justify-center text-[10px] tabular-nums ${current === s.key ? "border-brass text-brass" : "border-line text-muted"}`
              }
              aria-label={s.done ? "Done" : "Not done"}
            >
              {s.done ? <Check className="w-3 h-3" strokeWidth={2.5} /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className={s.done ? "text-sm text-muted line-through" : "text-sm font-medium"}>{s.title}</div>
              {!s.done && <div className="text-xs text-muted">{s.locked ? "After you connect Gmail." : s.detail}</div>}
            </div>
            {!s.done && !s.locked && <div className="shrink-0 max-w-full">{s.action}</div>}
          </li>
        ))}
      </ol>

      {state.digest && state.gmail && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-panel-2 border border-line p-3">
          <Mail className="w-4 h-4 text-brass shrink-0" strokeWidth={1.75} />
          <div className="min-w-0 flex-1 text-xs">
            {sendState === "sent" ? (
              <span>Sent. Check your inbox for today&apos;s brief. The next one arrives tomorrow morning.</span>
            ) : (
              <span className="text-muted">Don&apos;t wait for tomorrow: get today&apos;s brief by email now.</span>
            )}
          </div>
          {sendState !== "sent" && (
            <button onClick={() => void sendNow()} disabled={sendState === "sending"} className={btnQuiet}>
              {sendState === "sending" && <Loader2 className="w-3 h-3 animate-spin" />}
              Email it to me now
            </button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600 mt-3">
          {error}
        </p>
      )}
      <GoogleConnectDialog
        open={connectOpen}
        onClose={closeConnect}
        features={missing.length > 0 ? missing : ["gmail", "calendar"]}
        returnTo={state.gmail ? "/dashboard" : "/inbox?welcome=1"}
      />
    </section>
  );
}
