"use client";

import { useState } from "react";
import { Check, Copy, FileText, Loader2, TriangleAlert } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { MAX_NOTE, type Audience } from "@/lib/founder-update";

interface Result {
  subject: string;
  body: string;
  source: "ai" | "template";
  notice: string | null;
  facts: string;
  check: string[];
}

/** Weekly founder update: drafted from this week's real work. Sends nothing. */
export function FounderUpdatePanel() {
  const [audience, setAudience] = useState<Audience>("investors");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);

  async function draft() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/ai/founder-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience, note }),
      });
      const d = (await r.json().catch(() => ({}))) as Partial<Result> & { message?: string };
      if (!r.ok) throw new Error(d.message ?? "Couldn't draft the update.");
      setResult(d as Result);
      setSubject(d.subject ?? "");
      setBody(d.body ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't draft the update.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Couldn't copy. Select the text and copy it yourself.");
    }
  }

  return (
    <section className="space-y-4" aria-label="Weekly founder update">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-brass" strokeWidth={1.75} />
        <h2 className="font-display text-lg">Weekly founder update</h2>
      </div>
      <Panel className="p-6 space-y-4">
        <p className="text-sm text-muted">
          Vyris drafts this week&apos;s update from what actually happened: tasks shipped, what slipped, key results and risks. You
          edit it and send it yourself.
        </p>
        <div className="flex flex-wrap gap-2 text-xs" role="radiogroup" aria-label="Who it's for">
          {(["investors", "team"] as const).map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={audience === a}
              onClick={() => setAudience(a)}
              className={audience === a ? "px-3 py-1.5 rounded-lg bg-brass text-white" : "px-3 py-1.5 rounded-lg border border-line"}
            >
              {a === "investors" ? "Investors & advisors" : "Team"}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="update-note" className="text-[11px] uppercase tracking-[0.14em] text-muted block mb-1.5">
            Anything Vyris can&apos;t see (optional)
          </label>
          <textarea
            id="update-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={MAX_NOTE}
            rows={3}
            dir="auto"
            placeholder="Signed 2 new clients. Hiring a designer. Ask: intros to fintech founders in Cairo."
            className="w-full bg-panel-2 border border-line rounded-lg px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-brass"
          />
        </div>
        <button
          onClick={() => void draft()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-brass text-white disabled:opacity-50"
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {busy ? "Drafting..." : result ? "Draft again" : "Draft this week's update"}
        </button>
        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}

        {result && (
          <div className="space-y-3 border-t border-line pt-4">
            {result.notice && <p className="text-xs text-muted">{result.notice}</p>}
            {result.check.length > 0 && (
              <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                <TriangleAlert className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span>
                  Check before sending: {result.check.join(", ")} {result.check.length === 1 ? "isn't" : "aren't"} in your Vyris data or
                  your note.
                </span>
              </div>
            )}
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              aria-label="Subject"
              dir="auto"
              className="w-full bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm font-medium"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              aria-label="Update"
              rows={14}
              dir="auto"
              className="w-full bg-panel-2 border border-line rounded-lg px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-brass"
            />
            <div className="flex items-center justify-between gap-3">
              <details className="text-xs text-muted min-w-0">
                <summary className="cursor-pointer">Facts Vyris used</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words font-sans" dir="auto">
                  {result.facts}
                </pre>
              </details>
              <button
                onClick={() => void copy()}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-line hover:bg-black/[0.04]"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-signal" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </Panel>
    </section>
  );
}
