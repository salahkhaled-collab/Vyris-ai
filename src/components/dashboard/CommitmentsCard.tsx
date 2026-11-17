"use client";

import { useCallback, useEffect, useState } from "react";
import { Handshake, Loader2, Plus, X } from "lucide-react";
import { dueLabel, type Direction } from "@/lib/commitments";

interface Row {
  id: string;
  text: string;
  counterpart: string | null;
  direction: Direction;
  dueDate: string | null;
  overdue: boolean;
  source: string;
}

/**
 * Promises both ways: what you told people you'd do, and what they told you
 * they'd do. Added from an email summary, from chat, or here by hand.
 */
export function CommitmentsCard() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [timeZone, setTimeZone] = useState("UTC");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ text: "", counterpart: "", dueDate: "", direction: "MINE" as Direction });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/commitments", { cache: "no-store" });
    if (!r.ok) return;
    const d = (await r.json()) as { open: Row[]; timeZone: string };
    setRows(d.open);
    setTimeZone(d.timeZone);
  }, []);

  useEffect(() => {
    void load().catch(() => {});
  }, [load]);

  async function close(id: string, status: "DONE" | "DROPPED") {
    setBusy(id);
    setError(null);
    try {
      const r = await fetch(`/api/commitments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error();
      setRows((rs) => (rs ? rs.filter((x) => x.id !== id) : rs));
    } catch {
      setError("Couldn't update that promise. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy("new");
    setError(null);
    try {
      const r = await fetch("/api/commitments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: form.text,
          counterpart: form.counterpart || null,
          dueDate: form.dueDate || null,
          direction: form.direction,
        }),
      });
      const d = (await r.json().catch(() => ({}))) as { message?: string };
      if (!r.ok) throw new Error(d.message ?? "Couldn't save that promise.");
      setForm({ text: "", counterpart: "", dueDate: "", direction: form.direction });
      setAdding(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that promise.");
    } finally {
      setBusy(null);
    }
  }

  if (rows === null) return null;
  const now = new Date();
  const mine = rows.filter((r) => r.direction === "MINE");
  const theirs = rows.filter((r) => r.direction === "THEIRS");

  const list = (items: Row[], empty: string) =>
    items.length === 0 ? (
      <p className="text-xs text-muted">{empty}</p>
    ) : (
      <ul className="space-y-2.5">
        {items.slice(0, 8).map((r) => (
          <li key={r.id} className="flex items-start gap-2">
            <button
              onClick={() => void close(r.id, "DONE")}
              disabled={busy === r.id}
              aria-label={`Mark "${r.text}" done`}
              className="mt-0.5 w-4 h-4 rounded border border-line shrink-0 flex items-center justify-center hover:border-brass"
            >
              {busy === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-sm break-words" dir="auto">
                {r.text}
              </div>
              <div className="text-[11px] text-muted break-words">
                {r.counterpart ? (
                  <>
                    {r.direction === "MINE" ? "To" : "From"} <bdi>{r.counterpart}</bdi> ·{" "}
                  </>
                ) : null}
                <span className={r.overdue ? "text-red-600 font-medium" : undefined}>{dueLabel(r.dueDate, now, timeZone)}</span>
              </div>
            </div>
            <button
              onClick={() => void close(r.id, "DROPPED")}
              disabled={busy === r.id}
              aria-label={`Drop "${r.text}"`}
              className="p-0.5 rounded hover:bg-black/[0.06] shrink-0"
            >
              <X className="w-3.5 h-3.5 text-muted" strokeWidth={1.75} />
            </button>
          </li>
        ))}
        {items.length > 8 && <li className="text-[11px] text-muted">and {items.length - 8} more</li>}
      </ul>
    );

  return (
    <section aria-label="Promises" className="mb-6 rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Handshake className="w-4 h-4 text-brass" strokeWidth={1.75} />
          <h2 className="font-display text-xl">Promises</h2>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-line hover:bg-black/[0.04]"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={(e) => void add(e)} className="mb-4 space-y-2 rounded-lg border border-line bg-panel-2 p-3">
          <div className="flex gap-1 text-xs" role="radiogroup" aria-label="Who promised">
            {(["MINE", "THEIRS"] as const).map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={form.direction === d}
                onClick={() => setForm({ ...form, direction: d })}
                className={
                  form.direction === d
                    ? "px-2.5 py-1 rounded-md bg-brass text-white"
                    : "px-2.5 py-1 rounded-md border border-line"
                }
              >
                {d === "MINE" ? "I promised" : "They promised"}
              </button>
            ))}
          </div>
          <input
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
            placeholder={form.direction === "MINE" ? "Send Omar the revised quote" : "Confirm the Q1 budget"}
            maxLength={300}
            dir="auto"
            required
            className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <input
              value={form.counterpart}
              onChange={(e) => setForm({ ...form, counterpart: e.target.value })}
              placeholder={form.direction === "MINE" ? "To whom" : "Who"}
              maxLength={120}
              dir="auto"
              className="flex-1 min-w-[8rem] bg-panel border border-line rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              aria-label="Due date"
              className="bg-panel border border-line rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} className="text-xs px-3 py-1.5 rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy === "new" || !form.text.trim()}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-brass text-white disabled:opacity-50"
            >
              {busy === "new" ? "Saving..." : "Track it"}
            </button>
          </div>
        </form>
      )}

      {rows.length === 0 && !adding ? (
        <p className="text-sm text-muted">
          Nothing tracked yet. Summarize an email in the Inbox and Vyris finds the promises in it, or add one here.
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted mb-2">You promised</div>
            {list(mine, "Nothing you owe anyone.")}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted mb-2">Waiting on others</div>
            {list(theirs, "No one owes you anything.")}
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-600 mt-3">
          {error}
        </p>
      )}
    </section>
  );
}
