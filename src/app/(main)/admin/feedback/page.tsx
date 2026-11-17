"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, MessageSquareHeart } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { MOODS, MOOD_LABELS, type Mood } from "@/lib/feedback";

interface Entry {
  id: string;
  message: string;
  mood: Mood | null;
  page: string | null;
  createdAt: string;
  name: string | null;
  email: string | null;
}

const MOOD_EMOJI: Record<Mood, string> = { bad: "😕", ok: "🙂", great: "🤩" };

/** Owner-only list of in-app feedback (ADMIN_EMAILS). */
export default function FeedbackAdminPage() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "closed" | "error">("loading");
  const [filter, setFilter] = useState<Mood | "all">("all");

  useEffect(() => {
    fetch("/api/admin/feedback", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 404 || r.status === 401) return setState("closed");
        if (!r.ok) return setState("error");
        setEntries(((await r.json()) as { entries: Entry[] }).entries);
        setState("ok");
      })
      .catch(() => setState("error"));
  }, []);

  const counts = useMemo(() => {
    const c: Record<Mood, number> = { bad: 0, ok: 0, great: 0 };
    for (const e of entries ?? []) if (e.mood) c[e.mood]++;
    return c;
  }, [entries]);
  const shown = (entries ?? []).filter((e) => filter === "all" || e.mood === filter);

  return (
    <>
      <Topbar eyebrow="Owner" title="Feedback" titleIcon={MessageSquareHeart} />
      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8 space-y-6">
        {state === "loading" && <p className="text-sm text-muted py-8 text-center">Loading…</p>}
        {state === "error" && (
          <p role="alert" className="text-sm text-red-600">
            Couldn&apos;t load feedback. Refresh to try again.
          </p>
        )}
        {state === "closed" && (
          <Panel className="p-6">
            <h2 className="font-display text-xl mb-1">Not available</h2>
            <p className="text-sm text-muted">
              This page is only for the Vyris owner. If that&apos;s you, add your email to the ADMIN_EMAILS setting in
              Vercel and redeploy.
            </p>
          </Panel>
        )}
        {state === "ok" && entries && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">
                From the &ldquo;Send feedback&rdquo; button in the app. A copy of each is emailed to you.{" "}
                <Link href="/admin/metrics" className="underline">
                  Metrics
                </Link>
              </p>
              <a
                href="/api/admin/feedback?format=csv"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-brass text-white"
              >
                <Download className="w-4 h-4" /> Download CSV
              </a>
            </div>

            <div className="flex flex-wrap gap-2 text-xs" role="radiogroup" aria-label="Filter by mood">
              {(["all", ...MOODS] as const).map((m) => (
                <button
                  key={m}
                  role="radio"
                  aria-checked={filter === m}
                  onClick={() => setFilter(m)}
                  className={
                    filter === m ? "px-3 py-1.5 rounded-full bg-brass text-white" : "px-3 py-1.5 rounded-full border border-line"
                  }
                >
                  {m === "all" ? `All · ${entries.length}` : `${MOOD_EMOJI[m]} ${MOOD_LABELS[m]} · ${counts[m]}`}
                </button>
              ))}
            </div>

            {entries.length === 0 ? (
              <Panel className="p-6">
                <h2 className="font-display text-xl mb-1">No feedback yet</h2>
                <p className="text-sm text-muted">
                  Users send it from &ldquo;Send feedback&rdquo; in the sidebar (or More on phones). Ask your first users to
                  use it.
                </p>
              </Panel>
            ) : (
              <div className="space-y-3">
                {shown.map((e) => (
                  <Panel key={e.id} className="p-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted mb-2">
                      {e.mood && (
                        <span className="text-ink-text">
                          {MOOD_EMOJI[e.mood]} {MOOD_LABELS[e.mood]}
                        </span>
                      )}
                      <span>
                        <bdi>{e.name ?? "Someone"}</bdi>
                        {e.email && (
                          <>
                            {" · "}
                            <a href={`mailto:${e.email}`} className="hover:underline">
                              {e.email}
                            </a>
                          </>
                        )}
                      </span>
                      {e.page && <code className="text-[11px]">{e.page}</code>}
                      <span>{new Date(e.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
                    </div>
                    {e.message && (
                      <p className="text-sm whitespace-pre-wrap break-words" dir="auto">
                        {e.message}
                      </p>
                    )}
                  </Panel>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
