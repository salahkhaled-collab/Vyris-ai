"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";

export interface PendingActionView {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  summary: string;
}

type State = { status: "waiting" | "running" | "done" | "dismissed" | "error"; message?: string };

/** Fired after an approved action runs, so open pages can refresh their data. */
export const AI_ACTION_EVENT = "vyris:ai-action";

/**
 * Changes the assistant proposed. Nothing has happened until the user clicks
 * Approve; Dismiss drops it. Each action runs once.
 */
export function PendingActions({ actions }: { actions: PendingActionView[] }) {
  const [states, setStates] = useState<Record<string, State>>({});
  if (actions.length === 0) return null;

  const set = (id: string, s: State) => setStates((prev) => ({ ...prev, [id]: s }));

  async function approve(a: PendingActionView) {
    set(a.id, { status: "running" });
    try {
      const res = await fetch("/api/ai/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: a.tool, input: a.input }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        set(a.id, { status: "error", message: data.message ?? "That didn't work." });
        return;
      }
      set(a.id, { status: "done" });
      window.dispatchEvent(new CustomEvent(AI_ACTION_EVENT, { detail: { tool: a.tool } }));
    } catch {
      set(a.id, { status: "error", message: "Couldn't reach Vyris." });
    }
  }

  return (
    <div className="space-y-2" aria-label="Proposed changes">
      {actions.map((a) => {
        const st = states[a.id] ?? { status: "waiting" };
        return (
          <div key={a.id} className="rounded-xl border border-brass/30 bg-brass-soft/40 px-3 py-2.5 text-sm">
            <div className="text-[10px] uppercase tracking-wider text-muted mb-1">
              {st.status === "done" ? "Done" : st.status === "dismissed" ? "Dismissed" : "Needs your approval"}
            </div>
            <div className={st.status === "dismissed" ? "text-muted line-through" : "text-ink-text"}>{a.summary}</div>
            {(st.status === "waiting" || st.status === "error" || st.status === "running") && (
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => void approve(a)}
                  disabled={st.status === "running"}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-brass text-white disabled:opacity-50"
                >
                  {st.status === "running" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" strokeWidth={2} />
                  )}
                  {st.status === "error" ? "Try again" : "Approve"}
                </button>
                <button
                  onClick={() => set(a.id, { status: "dismissed" })}
                  disabled={st.status === "running"}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-line text-muted hover:text-ink-text disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2} />
                  Dismiss
                </button>
              </div>
            )}
            {st.status === "done" && (
              <div className="flex items-center gap-1 mt-1 text-xs text-signal">
                <Check className="w-3.5 h-3.5" strokeWidth={2} /> Done
              </div>
            )}
            {st.status === "error" && (
              <p role="alert" className="text-xs text-red-600 mt-1">
                {st.message}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
