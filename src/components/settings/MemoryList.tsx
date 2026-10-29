"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

interface SavedNote {
  id: string;
  content: string;
  createdAt: string;
}

interface NotesResponse {
  total: number;
  notes: SavedNote[];
}

function isNotesResponse(value: unknown): value is NotesResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { total?: unknown; notes?: unknown };
  return typeof v.total === "number" && Array.isArray(v.notes);
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function MemoryList() {
  const [notes, setNotes] = useState<SavedNote[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/memory", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load saved notes.");
      const data: unknown = await res.json();
      if (!isNotesResponse(data)) throw new Error("Unexpected response.");
      setNotes(data.notes);
      setTotal(data.total);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load saved notes.");
      setNotes((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/ai/memory?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error("Could not delete that note.");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not delete that note.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="bg-panel border border-line rounded-2xl p-6">
      <h2 className="font-display text-xl mb-1">What Vyris remembers</h2>
      <p className="text-sm text-muted mb-4">
        Notes Vyris saved when you asked it to remember something. It uses them in every chat.
        Delete one and Vyris stops using it right away.
      </p>

      {error && <div className="text-sm text-red-500 mb-3">{error}</div>}

      {notes === null ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted">
          Nothing saved yet. Tell Vyris &ldquo;remember that&hellip;&rdquo; in a chat and it will show up here.
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {notes.map((note) => (
              <li
                key={note.id}
                className="flex items-start justify-between gap-3 bg-panel-2 border border-line rounded-xl px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-ink-text break-words">{note.content}</p>
                  <p className="text-xs text-muted mt-1">{formatDate(note.createdAt)}</p>
                </div>
                <button
                  onClick={() => void handleDelete(note.id)}
                  disabled={deletingId !== null}
                  aria-label="Delete this note"
                  className="shrink-0 p-2 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
          {total > notes.length && (
            <p className="text-xs text-muted mt-3">
              Showing the newest {notes.length} of {total} notes.
            </p>
          )}
        </>
      )}
    </section>
  );
}
