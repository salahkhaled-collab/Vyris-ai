"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { useUser } from "@/lib/user-context";
import { cn } from "@/lib/utils";
import { Plus, X, Trash2, AlertTriangle } from "lucide-react";

interface Risk {
  id: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "MITIGATING" | "RESOLVED";
  ownerId: string;
  teamId: string | null;
}

const severityConfig = {
  LOW:      { label: "Low",      color: "text-muted",  bg: "bg-panel-2" },
  MEDIUM:   { label: "Medium",   color: "text-brass",  bg: "bg-brass-soft" },
  HIGH:     { label: "High",     color: "text-red-500", bg: "bg-red-500/10" },
  CRITICAL: { label: "Critical", color: "text-red-600", bg: "bg-red-500/15" },
};

const statusLabel = { OPEN: "Open", MITIGATING: "Mitigating", RESOLVED: "Resolved" };

const emptyForm = { title: "", description: "", severity: "MEDIUM" as Risk["severity"] };

export default function RisksPage() {
  const { workspaceType } = useUser();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [shareWithTeam, setShareWithTeam] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "personal" | "team">("all");

  useEffect(() => {
    fetch("/api/risks")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) { setError(d.message ?? "Could not load risks."); return; }
        setRisks(d.risks ?? []);
      })
      .catch(() => setError("Could not reach server."))
      .finally(() => setLoading(false));
  }, []);

  async function createRisk() {
    if (!form.title.trim() || !form.description.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/risks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, shareWithTeam }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message ?? "Could not save risk."); }
      const risk = await res.json();
      setRisks((prev) => [risk, ...prev]);
      setForm(emptyForm);
      setShareWithTeam(false);
      setCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save risk.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: Risk["status"]) {
    setRisks((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      const res = await fetch(`/api/risks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setError("Could not update status.");
    }
  }

  async function deleteRisk(id: string) {
    const previous = risks;
    setRisks((prev) => prev.filter((r) => r.id !== id));
    try {
      const res = await fetch(`/api/risks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setRisks(previous);
    }
  }

  const filtered = risks.filter((r) => {
    if (filter === "personal") return !r.teamId;
    if (filter === "team") return !!r.teamId;
    return true;
  });

  const openCount = risks.filter((r) => r.status !== "RESOLVED").length;

  return (
    <>
      <Topbar
        eyebrow="Direction"
        title="Risks"
        statusText={`${openCount} open`}
      />

      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-panel-2 rounded-full p-1 w-fit">
            {(["all", "personal", "team"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm capitalize transition-colors",
                  filter === f ? "bg-panel shadow-sm text-ink-text" : "text-muted hover:text-ink-text"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brass text-white"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              New risk
            </button>
          )}
        </div>

        {creating && (
          <Panel className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg">New risk</h3>
              <button onClick={() => setCreating(false)} className="text-muted hover:text-ink-text">
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                autoFocus
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="What's the risk?"
                className="w-full bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What's the impact if this happens? What would you do about it?"
                rows={3}
                className="w-full bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass resize-none"
              />
              <div className="flex items-center gap-2">
                {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setForm({ ...form, severity: s })}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-full transition-colors",
                      form.severity === s ? severityConfig[s].bg + " " + severityConfig[s].color : "bg-panel-2 text-muted"
                    )}
                  >
                    {severityConfig[s].label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between pt-1">
                {workspaceType === "TEAM" ? (
                  <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shareWithTeam}
                      onChange={(e) => setShareWithTeam(e.target.checked)}
                      className="accent-brass"
                    />
                    Share with team
                  </label>
                ) : <span />}
                <button
                  onClick={createRisk}
                  disabled={!form.title.trim() || !form.description.trim() || saving}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-brass text-white disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save risk"}
                </button>
              </div>
            </div>
          </Panel>
        )}

        {error && <div className="text-sm text-signal/80">{error}</div>}
        {loading && <div className="text-sm text-muted py-8 text-center">Loading risks...</div>}

        {!loading && filtered.length === 0 && !creating && (
          <Panel className="p-10 text-center">
            <AlertTriangle className="w-8 h-8 text-muted mx-auto mb-3" strokeWidth={1.5} />
            <div className="text-sm font-medium mb-1">No risks logged</div>
            <div className="text-xs text-muted">
              Track what could go wrong — for you or for the team — before it does.
            </div>
          </Panel>
        )}

        <div className="space-y-3">
          {filtered.map((r) => (
            <Panel key={r.id} className="p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full", severityConfig[r.severity].bg, severityConfig[r.severity].color)}>
                    {severityConfig[r.severity].label}
                  </span>
                  {r.teamId && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-panel-2 text-muted">Team</span>
                  )}
                  <h3 className="text-sm font-medium">{r.title}</h3>
                </div>
                <button onClick={() => deleteRisk(r.id)} className="text-muted hover:text-signal/80 shrink-0">
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
              </div>
              <p className="text-xs text-muted leading-relaxed mb-3">{r.description}</p>
              <div className="flex items-center gap-2">
                {(["OPEN", "MITIGATING", "RESOLVED"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(r.id, s)}
                    className={cn(
                      "text-[11px] px-2.5 py-1 rounded-full transition-colors",
                      r.status === s ? "bg-brass text-white" : "bg-panel-2 text-muted hover:text-ink-text"
                    )}
                  >
                    {statusLabel[s]}
                  </button>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      </main>
    </>
  );
}
