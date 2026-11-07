"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NotebookPen, Loader2 } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { MAX_NOTES_CHARS, type MeetingExtraction } from "@/lib/meeting-notes";

interface ProjectOption {
  id: string;
  title: string;
  status: string;
}

interface Member {
  id: string;
  name: string | null;
  email: string | null;
}

interface DraftItem {
  key: string;
  include: boolean;
  title: string;
  assigneeId: string;
  dueDate: string;
  ownerName: string | null;
}

function isExtraction(value: unknown): value is MeetingExtraction {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<MeetingExtraction>;
  return typeof v.summary === "string" && Array.isArray(v.decisions) && Array.isArray(v.actionItems);
}

/**
 * Paste meeting notes, get a summary, decisions and action items, review them,
 * then create the chosen ones as tasks in a project. Nothing is written until
 * the user clicks Create.
 */
export function MeetingNotesPanel() {
  const [notes, setNotes] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MeetingExtraction | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [projectId, setProjectId] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ count: number; failed: number; project: string } | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((d: { projects?: ProjectOption[] }) => {
        const active = (d.projects ?? []).filter((p) => p.status === "ACTIVE");
        setProjects(active);
        if (active.length === 1) setProjectId(active[0].id);
      })
      .catch(() => setProjects([]));
    fetch("/api/team/members")
      .then((r) => (r.ok ? r.json() : { members: [] }))
      .then((d: { members?: Member[] }) => setMembers(Array.isArray(d.members) ? d.members : []))
      .catch(() => setMembers([]));
  }, []);

  async function extract() {
    if (!notes.trim() || extracting) return;
    setExtracting(true);
    setError(null);
    setResult(null);
    setCreated(null);
    try {
      const res = await fetch("/api/ai/meeting-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const message = (data as { message?: string }).message;
        throw new Error(message ?? "Couldn't process those notes.");
      }
      if (!isExtraction(data)) throw new Error("Unexpected response.");
      setResult(data);
      setItems(
        data.actionItems.map((a, i) => ({
          key: `${i}-${a.title}`,
          include: true,
          title: a.title,
          assigneeId: a.assigneeId ?? "",
          dueDate: a.dueDate ?? "",
          ownerName: a.ownerName,
        }))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't process those notes.");
    } finally {
      setExtracting(false);
    }
  }

  function update(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  const chosen = items.filter((i) => i.include && i.title.trim());

  async function createTasks() {
    if (!projectId || chosen.length === 0 || creating) return;
    setCreating(true);
    setError(null);
    let count = 0;
    let failed = 0;
    for (const item of chosen) {
      try {
        const res = await fetch(`/api/projects/${projectId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: item.title.trim(),
            dueDate: item.dueDate || undefined,
            assigneeId: item.assigneeId || null,
          }),
        });
        if (res.ok) count += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }
    setCreating(false);
    setCreated({ count, failed, project: projects.find((p) => p.id === projectId)?.title ?? "the project" });
    if (failed === 0) {
      setNotes("");
      setResult(null);
      setItems([]);
    }
  }

  const showOwners = members.length > 1;

  return (
    <Panel className="p-5 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <NotebookPen className="w-4 h-4 text-brass" strokeWidth={1.75} />
          <h3 className="text-sm font-medium">Process meeting notes</h3>
        </div>
        <p className="text-xs text-muted">
          Paste your notes. Vyris writes a summary, pulls out decisions and action items, and you choose which become
          tasks.
        </p>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={MAX_NOTES_CHARS}
        rows={6}
        placeholder="e.g. Agreed to launch Dec 1. Mona to finish the pricing page by Friday. Salah to email Acme about the contract."
        className="w-full bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass resize-y"
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted">
          {notes.length.toLocaleString()} / {MAX_NOTES_CHARS.toLocaleString()}
        </span>
        <button
          onClick={() => void extract()}
          disabled={!notes.trim() || extracting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brass text-white disabled:opacity-40"
        >
          {extracting && <Loader2 className="w-4 h-4 animate-spin" />}
          {extracting ? "Reading notes..." : "Extract action items"}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-500" role="alert">
          {error}
        </div>
      )}

      {created && (
        <div className="text-sm">
          Created {created.count} task{created.count === 1 ? "" : "s"} in <strong>{created.project}</strong>.
          {created.failed > 0 && <span className="text-red-500"> {created.failed} couldn&apos;t be created.</span>}{" "}
          <Link href="/projects" className="text-brass underline">
            Open Projects
          </Link>
        </div>
      )}

      {result && (
        <div className="space-y-4 border-t border-line pt-4">
          {result.summary && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted mb-1">Summary</div>
              <p className="text-sm">{result.summary}</p>
            </div>
          )}

          {result.decisions.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted mb-1">Decisions</div>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {result.decisions.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted mb-2">
              Action items · {items.length}
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-muted">No action items found in these notes.</p>
            ) : (
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.key} className="flex flex-wrap items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.include}
                      onChange={(e) => update(item.key, { include: e.target.checked })}
                      aria-label={`Include ${item.title}`}
                      className="accent-brass"
                    />
                    <input
                      value={item.title}
                      onChange={(e) => update(item.key, { title: e.target.value })}
                      maxLength={200}
                      className="flex-1 min-w-[12rem] bg-panel-2 border border-line rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brass"
                    />
                    {showOwners ? (
                      <select
                        value={item.assigneeId}
                        onChange={(e) => update(item.key, { assigneeId: e.target.value })}
                        aria-label="Owner"
                        className="bg-panel-2 border border-line rounded-lg px-2 py-1.5 text-xs"
                      >
                        <option value="">{item.ownerName && !item.assigneeId ? `${item.ownerName}?` : "Unassigned"}</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name || m.email || "Unnamed"}
                          </option>
                        ))}
                      </select>
                    ) : (
                      item.ownerName && <span className="text-xs text-muted">Owner: {item.ownerName}</span>
                    )}
                    <input
                      type="date"
                      value={item.dueDate}
                      onChange={(e) => update(item.key, { dueDate: e.target.value })}
                      aria-label="Due date"
                      className="bg-panel-2 border border-line rounded-lg px-2 py-1.5 text-xs text-muted"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {items.length > 0 && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {projects.length === 0 ? (
                <span className="text-xs text-muted">Create an active project first to add these as tasks.</span>
              ) : (
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  aria-label="Project"
                  className="bg-panel-2 border border-line rounded-lg px-2 py-2 text-sm"
                >
                  <option value="">Choose a project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => void createTasks()}
                disabled={!projectId || chosen.length === 0 || creating}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-brass text-white disabled:opacity-40"
              >
                {creating ? "Creating..." : `Create ${chosen.length} task${chosen.length === 1 ? "" : "s"}`}
              </button>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
