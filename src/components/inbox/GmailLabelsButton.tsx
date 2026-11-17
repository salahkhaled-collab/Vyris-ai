"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Tag } from "lucide-react";
import { connectGoogle } from "@/lib/google-connect";
import type { TriageResult } from "@/lib/inbox-ai";

const ON_KEY = "vyris.gmailLabels.on";
const PENDING_KEY = "vyris.gmailLabels.pending";

const read = (k: string, store: "local" | "session" = "local") => {
  try {
    return (store === "local" ? window.localStorage : window.sessionStorage).getItem(k) === "1";
  } catch {
    return false;
  }
};
const write = (k: string, on: boolean, store: "local" | "session" = "local") => {
  try {
    const s = store === "local" ? window.localStorage : window.sessionStorage;
    if (on) s.setItem(k, "1");
    else s.removeItem(k);
  } catch {
    // storage unavailable: labels still work, they just don't stay on
  }
};

/**
 * Puts Vyris's priorities on the emails in Gmail itself as labels
 * (Vyris/Urgent, Vyris/Needs reply, Vyris/FYI, Vyris/Low). Once turned on,
 * every re-sort updates the labels. Only labels change in Gmail.
 */
export function GmailLabelsButton({ triage }: { triage: Record<string, TriageResult> | null }) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const lastApplied = useRef<Record<string, TriageResult> | null>(null);

  useEffect(() => {
    setOn(read(ON_KEY));
  }, []);

  async function apply(results: Record<string, TriageResult>) {
    const assignments = Object.entries(results).map(([id, r]) => ({ id, priority: r.priority }));
    if (assignments.length === 0) return;
    lastApplied.current = results;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/gmail/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: assignments.slice(0, 100) }),
      });
      const data = (await res.json().catch(() => ({}))) as { applied?: number; error?: string; message?: string };
      if (res.status === 403 && data.error === "missing_scope") {
        setNeedsPermission(true);
        return;
      }
      if (!res.ok) throw new Error(data.message ?? "Couldn't update Gmail labels.");
      write(ON_KEY, true);
      setOn(true);
      setNeedsPermission(false);
      setMessage(`Labeled ${data.applied ?? assignments.length} emails in Gmail.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't update Gmail labels.");
    } finally {
      setBusy(false);
    }
  }

  // Back from Google's permission screen, or labels are on: label the new sort.
  useEffect(() => {
    if (!triage || busy || lastApplied.current === triage) return;
    const pending = read(PENDING_KEY, "session");
    if (pending) write(PENDING_KEY, false, "session");
    if (pending || on) void apply(triage);
    // Re-run only when the sort or the on/off switch changes.
  }, [triage, on]);

  function allow() {
    write(PENDING_KEY, true, "session");
    connectGoogle("gmail_labels");
  }

  function turnOff() {
    write(ON_KEY, false);
    setOn(false);
    setMessage("Gmail labels are off. Labels already in Gmail stay until you remove them there.");
  }

  if (!triage) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {on ? (
          <>
            <span className="inline-flex items-center gap-1 text-muted">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-signal" />}
              {busy ? "Updating Gmail labels..." : "Gmail labels on"}
            </span>
            <button onClick={turnOff} className="underline text-muted">
              Turn off
            </button>
          </>
        ) : (
          <button
            onClick={() => void apply(triage)}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium bg-panel-2 border border-line disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Tag className="w-3.5 h-3.5" strokeWidth={1.75} />}
            Label in Gmail
          </button>
        )}
        {message && <span className="text-muted">{message}</span>}
      </div>
      {needsPermission && (
        <div className="rounded-lg border border-line bg-panel-2 p-3 text-xs space-y-2">
          <p>
            To show these priorities in Gmail, Vyris needs permission to change labels. It only adds and removes its own
            labels (Vyris/Urgent, Vyris/Needs reply, Vyris/FYI, Vyris/Low). It never archives, deletes or marks anything read.
          </p>
          <div className="flex gap-2">
            <button onClick={allow} className="px-3 py-1.5 rounded-lg bg-brass text-white font-medium">
              Allow in Google
            </button>
            <button onClick={() => setNeedsPermission(false)} className="px-3 py-1.5 rounded-lg">
              Not now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
