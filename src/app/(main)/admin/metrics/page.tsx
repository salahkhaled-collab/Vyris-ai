"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Download } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import type { FunnelStep, InvestorMetrics, WeekRow } from "@/lib/investor-metrics";

const shortWeek = (w: string) =>
  new Date(`${w}T00:00:00.000Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function Tile({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <Panel className="p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className="font-display text-3xl tabular-nums">{value}</div>
      {note && <div className="text-[11px] text-muted mt-0.5">{note}</div>}
    </Panel>
  );
}

/** One series per chart: thin bars from the baseline, a hover tooltip on each, the title names the series. */
function WeeklyBars({ title, rows, pick }: { title: string; rows: WeekRow[]; pick: (r: WeekRow) => number }) {
  const max = Math.max(1, ...rows.map(pick));
  const [hover, setHover] = useState<number | null>(null);
  return (
    <Panel className="p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-[11px] text-muted">per week, last {rows.length}</span>
      </div>
      <div className="relative h-32 flex items-end gap-1.5 border-b border-line" role="img" aria-label={`${title} per week`}>
        {rows.map((r, i) => {
          const v = pick(r);
          return (
            <div
              key={r.week}
              className="flex-1 h-full flex items-end"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              tabIndex={0}
              aria-label={`Week of ${shortWeek(r.week)}: ${v}`}
            >
              <div
                className="w-full rounded-t bg-brass transition-opacity"
                style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? 2 : 0, opacity: hover === null || hover === i ? 1 : 0.45 }}
              />
            </div>
          );
        })}
        {hover !== null && (
          <div className="absolute -top-1 right-0 rounded-md border border-line bg-panel px-2 py-1 text-[11px] shadow-sm">
            Week of {shortWeek(rows[hover].week)}: <span className="font-medium tabular-nums">{pick(rows[hover])}</span>
          </div>
        )}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {rows.map((r, i) => (
          <div key={r.week} className="flex-1 text-center text-[10px] text-muted whitespace-nowrap overflow-visible">
            {i % 2 === rows.length % 2 ? shortWeek(r.week) : ""}
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** The first-week path: one bar per step, each as a share of who could reach it. */
function Funnel({ steps }: { steps: FunnelStep[] }) {
  return (
    <Panel className="p-5">
      <div className="mb-3">
        <h3 className="text-sm font-medium">First week</h3>
        <p className="text-[11px] text-muted mt-0.5">
          How far new users get. &ldquo;Came back&rdquo; counts only people who signed up at least 7 days ago.
        </p>
      </div>
      <ol className="space-y-2.5">
        {steps.map((s) => {
          const pct = s.of > 0 ? Math.round((s.users / s.of) * 100) : 0;
          return (
            <li key={s.key} className="grid grid-cols-[9.5rem_1fr_auto] items-center gap-3 text-sm">
              <span className="truncate">{s.label}</span>
              <div className="h-2.5 rounded bg-black/[0.05] overflow-hidden" aria-hidden>
                <div className="h-full rounded bg-brass" style={{ width: `${pct}%`, minWidth: s.users > 0 ? 4 : 0 }} />
              </div>
              <span className="tabular-nums text-xs text-muted whitespace-nowrap">
                <span className="text-ink-text font-medium">{s.users}</span> of {s.of}
                {s.of > 0 && ` · ${pct}%`}
              </span>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

/** Owner-only: the numbers an investor asks for, from real usage (ADMIN_EMAILS). */
export default function MetricsAdminPage() {
  const [m, setM] = useState<InvestorMetrics | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "closed" | "error">("loading");

  useEffect(() => {
    fetch("/api/admin/metrics", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 404 || r.status === 401) return setState("closed");
        if (!r.ok) return setState("error");
        setM((await r.json()) as InvestorMetrics);
        setState("ok");
      })
      .catch(() => setState("error"));
  }, []);

  return (
    <>
      <Topbar eyebrow="Owner" title="Metrics" titleIcon={BarChart3} />
      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8 space-y-6">
        {state === "loading" && <p className="text-sm text-muted py-8 text-center">Loading…</p>}
        {state === "error" && (
          <p role="alert" className="text-sm text-red-600">
            Couldn&apos;t load the metrics. Refresh to try again.
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
        {state === "ok" && m && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">
                Real usage, days and weeks in UTC. Updated {new Date(m.generatedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}.{" "}
                <Link href="/admin/waitlist" className="underline">
                  Waitlist list
                </Link>
                {" · "}
                <Link href="/admin/feedback" className="underline">
                  Feedback
                </Link>
              </p>
              <a
                href="/api/admin/metrics?format=csv"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-brass text-white"
              >
                <Download className="w-4 h-4" /> Download CSV
              </a>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Tile label="Users" value={m.totals.users} note={`${m.totals.activated} activated`} />
              <Tile label="Weekly active" value={m.totals.wau} note={`${m.totals.dau} today · ${m.totals.mau} in 30 days`} />
              <Tile label="Waitlist" value={m.totals.waitlist} />
              <Tile label="Paying" value="—" note="Payments not set up yet" />
            </div>

            <Funnel steps={m.funnel} />

            <div className="grid gap-4 lg:grid-cols-3">
              <WeeklyBars title="Sign-ups" rows={m.weeks} pick={(r) => r.signups} />
              <WeeklyBars title="Active users" rows={m.weeks} pick={(r) => r.activeUsers} />
              <WeeklyBars title="Waitlist joins" rows={m.weeks} pick={(r) => r.waitlist} />
            </div>

            <Panel className="p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-line">
                <h3 className="text-sm font-medium">Retention by sign-up week</h3>
                <p className="text-[11px] text-muted mt-0.5">
                  Share of each week&apos;s new users who came back 1–4 weeks later. Blank = that week hasn&apos;t ended.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead className="text-left text-[11px] uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-5 py-2 font-medium">Signed up</th>
                      <th className="px-5 py-2 font-medium">Users</th>
                      {[1, 2, 3, 4].map((k) => (
                        <th key={k} className="px-3 py-2 font-medium text-center whitespace-nowrap">
                          Week {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {m.cohorts.map((c) => (
                      <tr key={c.week} className="border-t border-line">
                        <td className="px-5 py-2 whitespace-nowrap text-muted">Week of {shortWeek(c.week)}</td>
                        <td className="px-5 py-2">{c.size}</td>
                        {c.retained.map((r, k) => (
                          <td key={k} className="px-1.5 py-1.5">
                            {r === null || c.size === 0 ? (
                              <div className="h-8" />
                            ) : (
                              <div
                                className={`h-8 rounded flex items-center justify-center text-xs ${r >= 60 ? "text-white" : "text-ink-text"}`}
                                // Brass (#6e2f3a), one hue: lighter = fewer came back.
                                style={{ backgroundColor: `rgba(110, 47, 58, ${0.08 + (r / 100) * 0.72})` }}
                                title={`${r}% of ${c.size} came back in week ${k + 1}`}
                              >
                                {r}%
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <p className="text-[11px] text-muted">
              Active = opened the app that day (recorded from now on) or, for earlier weeks, sent the assistant a message
              or created a project, task or decision. Activated = connected Gmail or Calendar, created a project, or used
              the assistant.
            </p>
          </>
        )}
      </main>
    </>
  );
}
