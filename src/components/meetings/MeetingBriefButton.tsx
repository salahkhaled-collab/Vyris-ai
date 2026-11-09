"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import type { MeetingBrief } from "@/lib/meeting-brief";

interface BriefResponse {
  brief?: MeetingBrief;
  sources?: { contacts: number; projects: number; emails: number };
  thin?: boolean;
  message?: string;
}

/** "Brief me" for one meeting: asks the AI once, then toggles the brief open and closed. */
export function MeetingBriefButton({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BriefResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (data?.brief) {
      setOpen((o) => !o);
      return;
    }
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/meeting-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const json = (await res.json().catch(() => ({}))) as BriefResponse;
      if (!res.ok || !json.brief) setError(json.message ?? "Couldn't write a brief right now.");
      else setData(json);
    } catch {
      setError("Couldn't reach Vyris.");
    } finally {
      setLoading(false);
    }
  }

  const brief = data?.brief;
  const sources = data?.sources;

  return (
    <div className="mt-2">
      <button
        onClick={() => void load()}
        className="flex items-center gap-1.5 text-xs font-medium text-brass hover:underline"
        aria-expanded={open}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" strokeWidth={1.75} />}
        {brief && open ? "Hide brief" : "Brief me"}
      </button>

      {open && !loading && error && <p className="mt-2 text-xs text-red-500" role="alert">{error}</p>}

      {open && brief && (
        <div className="mt-3 rounded-lg bg-panel-2 p-4 space-y-3 text-sm">
          {brief.purpose && <p>{brief.purpose}</p>}
          {brief.people.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted mb-1">Who</div>
              <ul className="space-y-1">
                {brief.people.map((p) => (
                  <li key={p.name}>
                    <span className="font-medium">{p.name}</span>
                    {p.note && <span className="text-muted">: {p.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {brief.openItems.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted mb-1">Open items</div>
              <ul className="list-disc pl-4 space-y-0.5">
                {brief.openItems.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          )}
          {brief.talkingPoints.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted mb-1">Raise</div>
              <ul className="list-disc pl-4 space-y-0.5">
                {brief.talkingPoints.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          )}
          {data?.thin && (
            <p className="text-xs text-muted border-t border-line pt-2">
              Vyris has nothing on file for this meeting yet: no guests, notes, related project or emails. Add guests
              in Google Calendar, or save the people to Contacts, for a brief worth reading.
            </p>
          )}
          {sources && (
            <p className="text-[11px] text-muted">
              From {sources.contacts} contact{sources.contacts === 1 ? "" : "s"}, {sources.projects} project
              {sources.projects === 1 ? "" : "s"} and {sources.emails} recent email{sources.emails === 1 ? "" : "s"}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
