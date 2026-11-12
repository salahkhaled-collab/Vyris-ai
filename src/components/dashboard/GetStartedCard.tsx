"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, X } from "lucide-react";
import { connectGoogle } from "@/lib/google-connect";
import { track } from "@/lib/analytics";

type Checklist = { gmail: boolean; calendar: boolean; project: boolean; digest: boolean };
const DISMISS_KEY = "vyris.getStarted.dismissed";

/**
 * First steps for a new account, on Home. Disappears once everything is done
 * or the user dismisses it. Each step is one click.
 */
export function GetStartedCard() {
  const [state, setState] = useState<Checklist | null>(null);
  const [hidden, setHidden] = useState(false);
  const [digestBusy, setDigestBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") setHidden(true);
    } catch {
      // storage unavailable: just show the card
    }
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
  const done = [state.gmail, state.calendar, state.project, state.digest].filter(Boolean).length;
  if (done === 4) return null;

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
        body: JSON.stringify({ name: "Morning digest", trigger: "daily_digest", action: { type: "email_me" } }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message ?? "Couldn't turn on the digest.");
      }
      track("digest_enabled");
      setState((s) => (s ? { ...s, digest: true } : s));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't turn on the digest.");
    } finally {
      setDigestBusy(false);
    }
  }

  const steps: { key: keyof Checklist; title: string; detail: string; action: React.ReactNode }[] = [
    {
      key: "gmail",
      title: "Connect Gmail",
      detail:
        "Vyris sorts your inbox and drafts replies. Google may warn that the app is unverified while we're in review: choose Advanced, then Continue.",
      action: (
        <button
          onClick={() => {
            track("connect_gmail_click");
            connectGoogle("gmail");
          }}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-brass text-white"
        >
          Connect
        </button>
      ),
    },
    {
      key: "calendar",
      title: "Connect Google Calendar",
      detail: "Get a short brief before each meeting and warnings when meetings overlap.",
      action: (
        <button
          onClick={() => {
            track("connect_calendar_click");
            connectGoogle("calendar");
          }}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-brass text-white"
        >
          Connect
        </button>
      ),
    },
    {
      key: "project",
      title: "Add your first project",
      detail: "Vyris watches its tasks and tells you what's blocked or overdue.",
      action: (
        <Link href="/projects" className="text-xs font-medium px-3 py-1.5 rounded-lg bg-brass text-white">
          Add project
        </Link>
      ),
    },
    {
      key: "digest",
      title: "Get a morning digest",
      detail: "One email each morning with what needs your attention today.",
      action: (
        <button
          onClick={() => void enableDigest()}
          disabled={digestBusy}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-brass text-white disabled:opacity-50 inline-flex items-center gap-1"
        >
          {digestBusy && <Loader2 className="w-3 h-3 animate-spin" />}
          Turn on
        </button>
      ),
    },
  ];

  return (
    <section aria-label="Get started" className="mb-6 rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-display text-xl">Get started</h2>
          <p className="text-xs text-muted mt-0.5">{done} of 4 done</p>
        </div>
        <button onClick={dismiss} aria-label="Hide the Get started card" className="p-1 rounded hover:bg-black/[0.06]">
          <X className="w-4 h-4 text-muted" strokeWidth={1.75} />
        </button>
      </div>
      <ol className="space-y-3">
        {steps.map((s) => (
          <li key={s.key} className="flex flex-wrap items-center gap-3">
            <span
              className={
                state[s.key]
                  ? "w-5 h-5 rounded-full bg-signal text-white flex items-center justify-center shrink-0"
                  : "w-5 h-5 rounded-full border border-line shrink-0"
              }
              aria-label={state[s.key] ? "Done" : "Not done"}
            >
              {state[s.key] && <Check className="w-3 h-3" strokeWidth={2.5} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className={state[s.key] ? "text-sm text-muted line-through" : "text-sm font-medium"}>{s.title}</div>
              {!state[s.key] && <div className="text-xs text-muted">{s.detail}</div>}
            </div>
            {!state[s.key] && <div className="shrink-0">{s.action}</div>}
          </li>
        ))}
      </ol>
      {error && (
        <p role="alert" className="text-xs text-red-600 mt-3">
          {error}
        </p>
      )}
    </section>
  );
}
