"use client";

import { useState } from "react";
import { Check, Handshake, Loader2 } from "lucide-react";
import type { ProposedCommitment } from "@/lib/commitments";

/**
 * Promises the AI found in this thread. Nothing is saved until the user
 * clicks Track on a promise.
 */
export function ThreadPromises({ proposals, threadId }: { proposals: ProposedCommitment[]; threadId: string | null }) {
  const [state, setState] = useState<Record<number, "saving" | "saved" | string>>({});
  if (proposals.length === 0) return null;

  async function track(i: number, p: ProposedCommitment) {
    setState((s) => ({ ...s, [i]: "saving" }));
    try {
      const res = await fetch("/api/commitments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...p, source: "email", sourceRef: threadId }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Couldn't track this promise.");
      setState((s) => ({ ...s, [i]: "saved" }));
    } catch (err) {
      setState((s) => ({ ...s, [i]: err instanceof Error ? err.message : "Couldn't track this promise." }));
    }
  }

  return (
    <div className="border-t border-line pt-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-muted mb-2">
        <Handshake className="w-3.5 h-3.5" strokeWidth={1.75} />
        Promises in this thread
      </div>
      <ul className="space-y-2">
        {proposals.map((p, i) => {
          const st = state[i];
          return (
            <li key={`${p.direction}-${p.text}`} className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm break-words" dir="auto">
                  {p.text}
                </div>
                <div className="text-[11px] text-muted break-words">
                  {p.direction === "MINE" ? (
                    <>You promised{p.counterpart ? <> <bdi>{p.counterpart}</bdi></> : null}</>
                  ) : (
                    <>{p.counterpart ? <bdi>{p.counterpart}</bdi> : "They"} promised you</>
                  )}
                  {p.dueDate ? ` · by ${p.dueDate}` : ""}
                </div>
                {st && st !== "saving" && st !== "saved" && <div className="text-[11px] text-red-500">{st}</div>}
              </div>
              <button
                onClick={() => void track(i, p)}
                disabled={st === "saving" || st === "saved"}
                className="shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-line hover:bg-black/[0.04] disabled:opacity-60"
              >
                {st === "saving" && <Loader2 className="w-3 h-3 animate-spin" />}
                {st === "saved" && <Check className="w-3 h-3 text-signal" />}
                {st === "saved" ? "Tracked" : "Track"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
