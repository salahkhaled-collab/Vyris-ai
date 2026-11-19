"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";

export const INBOX_SEEN_KEY = "vyris.inboxSeen";

/**
 * After a new user connects Gmail they land here with ?welcome=1. Tells them
 * what just happened and the one next step (the morning brief), then gets out
 * of the way.
 */
export function InboxWelcome({ sorted }: { sorted: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(INBOX_SEEN_KEY, "1");
    } catch {
      // storage unavailable: nothing to remember
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "1") {
      setShow(true);
      params.delete("welcome");
      const qs = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    }
  }, []);

  if (!show) return null;
  return (
    <div role="status" className="flex flex-wrap items-start gap-3 rounded-xl border border-brass/30 bg-brass/[0.06] p-4">
      <Sparkles className="w-4 h-4 text-brass mt-0.5 shrink-0" strokeWidth={1.75} />
      <div className="min-w-0 flex-1 text-sm">
        <div className="font-medium">{sorted ? "Your inbox is sorted." : "Sorting your inbox…"}</div>
        <div className="text-muted text-xs mt-0.5">
          Urgent and waiting-on-you mail is at the top. Next: get the morning brief, one email each morning with what
          matters today.
        </div>
      </div>
      <Link href="/dashboard" className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-brass text-white">
        Set up the brief
      </Link>
      <button onClick={() => setShow(false)} aria-label="Hide" className="p-1 rounded hover:bg-black/[0.06] shrink-0">
        <X className="w-4 h-4 text-muted" strokeWidth={1.75} />
      </button>
    </div>
  );
}
