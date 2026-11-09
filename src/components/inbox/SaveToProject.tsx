"use client";

import { useEffect, useState } from "react";
import { Check, FolderPlus, Loader2 } from "lucide-react";

/**
 * Save the open email's thread to a project. The AI's suggested project is
 * preselected; the list comes from triage, or from /api/projects if triage
 * hasn't run. The server reads the email from Gmail itself.
 */
export function SaveToProject({
  messageId,
  suggestedProjectId,
  knownProjects,
}: {
  messageId: string;
  suggestedProjectId: string | null;
  knownProjects: Record<string, string>;
}) {
  const [projects, setProjects] = useState<Record<string, string>>(knownProjects);
  const [projectId, setProjectId] = useState<string>(suggestedProjectId ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSaved(null);
    setError(null);
    setProjectId(suggestedProjectId ?? "");
  }, [messageId, suggestedProjectId]);

  useEffect(() => {
    if (Object.keys(knownProjects).length > 0) {
      setProjects(knownProjects);
      return;
    }
    let active = true;
    fetch("/api/projects")
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((d: { projects?: { id: string; title: string; status: string }[] }) => {
        if (!active) return;
        const list = (d.projects ?? []).filter((p) => p.status !== "DONE");
        setProjects(Object.fromEntries(list.map((p) => [p.id, p.title])));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [knownProjects]);

  const entries = Object.entries(projects);
  if (entries.length === 0) return null;

  async function save() {
    if (!projectId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; project?: { title: string } };
      if (!res.ok) setError(data.message ?? "Couldn't save it.");
      else setSaved(data.project?.title ?? projects[projectId] ?? "the project");
    } catch {
      setError("Couldn't reach Vyris.");
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-700">
        <Check className="w-3.5 h-3.5" strokeWidth={2} />
        Saved to {saved}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <FolderPlus className="w-3.5 h-3.5 text-muted shrink-0" strokeWidth={1.75} />
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          aria-label="Project to save this email to"
          className="min-w-0 flex-1 bg-panel-2 border border-line rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brass"
        >
          <option value="">Save to project…</option>
          {entries.map(([id, title]) => (
            <option key={id} value={id}>
              {title}
              {id === suggestedProjectId ? " (suggested)" : ""}
            </option>
          ))}
        </select>
        <button
          onClick={() => void save()}
          disabled={!projectId || saving}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-brass text-white disabled:opacity-50"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
