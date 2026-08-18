"use client";

import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { NewObjectiveForm } from "@/components/strategy/NewObjectiveForm";
import { NewStrategicBetForm } from "@/components/strategy/NewStrategicBetForm";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";

type KeyResult = { id: string; label: string; current: number; target: number; unit: string };
type Objective = {
  id: string;
  title: string;
  quarter: string;
  progress: number;
  keyResults: KeyResult[];
};
type StrategicBet = {
  id: string;
  title: string;
  signal: string;
  horizon: string;
  status: "ON_TRACK" | "AT_RISK" | "OFF_TRACK";
};

function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1 rounded-full bg-panel-2 overflow-hidden", className)}>
      <div
        className="h-full rounded-full bg-brass transition-all duration-700"
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function KRRow({
  kr,
  onUpdated,
}: {
  kr: KeyResult;
  onUpdated: (updated: KeyResult) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(kr.current));
  const [saving, setSaving] = useState(false);
  const pct = kr.target === 0 ? 0 : Math.min((kr.current / kr.target) * 100, 100);

  async function save() {
    const num = Number(value);
    if (Number.isNaN(num)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/key-results/${kr.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: num }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      onUpdated(updated);
      setEditing(false);
    } catch {
      // silently revert — the visible current value just won't have changed
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline gap-2">
        <span className="text-xs text-muted">{kr.label}</span>
        {editing ? (
          <span className="flex items-center gap-1">
            <input
              type="number"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              className="w-16 bg-panel rounded px-1.5 py-0.5 text-xs border border-line font-mono"
            />
            <span className="text-muted text-xs">/ {kr.target}{kr.unit}</span>
            <button
              onClick={save}
              disabled={saving}
              className="text-[11px] text-brass ml-1"
            >
              {saving ? "…" : "Save"}
            </button>
          </span>
        ) : (
          <button
            onClick={() => { setValue(String(kr.current)); setEditing(true); }}
            className="font-mono text-xs text-ink-text/70 hover:text-brass transition-colors"
          >
            {kr.current}{kr.unit} <span className="text-muted">/ {kr.target}{kr.unit}</span>
          </button>
        )}
      </div>
      <ProgressBar value={pct} />
    </div>
  );
}

const betStatusConfig = {
  ON_TRACK: { label: "On track", color: "text-signal", bg: "bg-signal/10", icon: CheckCircle2 },
  AT_RISK: { label: "At risk", color: "text-brass", bg: "bg-brass-soft", icon: AlertCircle },
  OFF_TRACK: { label: "Off track", color: "text-red-400", bg: "bg-red-500/10", icon: AlertCircle },
};

function BetRow({
  bet,
  onUpdated,
  onDeleted,
}: {
  bet: StrategicBet;
  onUpdated: (updated: StrategicBet) => void;
  onDeleted: (id: string) => void;
}) {
  const [changing, setChanging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const cfg = betStatusConfig[bet.status];

  async function setStatus(status: StrategicBet["status"]) {
    setChanging(true);
    try {
      const res = await fetch(`/api/strategic-bets/${bet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      onUpdated(updated);
    } catch {
      // silently fail — status just won't change on screen
    } finally {
      setChanging(false);
    }
  }

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/strategic-bets/${bet.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      onDeleted(bet.id);
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <div className="px-6 py-5 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink-text">{bet.title}</p>
          <p className="text-xs text-muted mt-1.5 leading-relaxed">{bet.signal}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <select
              value={bet.status}
              disabled={changing}
              onChange={(e) => setStatus(e.target.value as StrategicBet["status"])}
              className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded-full border-none cursor-pointer", cfg.bg, cfg.color)}
            >
              <option value="ON_TRACK">On track</option>
              <option value="AT_RISK">At risk</option>
              <option value="OFF_TRACK">Off track</option>
            </select>
            <button
              onClick={handleDelete}
              disabled={deleting}
              onBlur={() => setConfirming(false)}
              className={cn(
                "text-[11px] px-2 py-1 rounded-full transition-colors",
                confirming ? "bg-red-500/20 text-red-400" : "text-muted hover:text-red-400"
              )}
              title={confirming ? "Click again to confirm" : "Delete this bet"}
            >
              {deleting ? "…" : confirming ? "Confirm?" : <Trash2 className="w-3 h-3" />}
            </button>
          </div>
          <span className="text-[11px] text-muted font-mono">{bet.horizon}</span>
        </div>
      </div>
    </div>
  );
}

function ObjectiveCard({
  o,
  onKRUpdated,
  onDeleted,
}: {
  o: Objective;
  onKRUpdated: (updated: KeyResult) => void;
  onDeleted: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/objectives/${o.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      onDeleted(o.id);
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <Panel className="p-6 space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase tracking-[0.14em] text-muted">{o.quarter}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-brass">{o.progress}%</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              onBlur={() => setConfirming(false)}
              className={cn(
                "text-[11px] px-1.5 py-0.5 rounded transition-colors",
                confirming ? "bg-red-500/20 text-red-400" : "text-muted hover:text-red-400"
              )}
              title={confirming ? "Click again to confirm" : "Delete this objective"}
            >
              {deleting ? "…" : confirming ? "Confirm?" : <Trash2 className="w-3 h-3" />}
            </button>
          </div>
        </div>
        <p className="text-sm font-medium text-ink-text leading-snug">{o.title}</p>
        <ProgressBar value={o.progress} className="mt-3" />
      </div>
      <div className="space-y-3 pt-1 border-t border-line">
        {o.keyResults.map((kr) => (
          <KRRow key={kr.id} kr={kr} onUpdated={onKRUpdated} />
        ))}
      </div>
    </Panel>
  );
}

export default function StrategyPage() {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [bets, setBets] = useState<StrategicBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadAll() {
    setLoading(true);
    Promise.all([
      fetch("/api/objectives").then((res) => (res.ok ? res.json() : Promise.reject())),
      fetch("/api/strategic-bets").then((res) => (res.ok ? res.json() : Promise.reject())),
    ])
      .then(([objectivesData, betsData]) => {
        setObjectives(objectivesData);
        setBets(betsData);
      })
      .catch(() => setError("Failed to load strategy data"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
  }, []);

  function handleKRUpdated(objectiveId: string, updated: KeyResult) {
    setObjectives((prev) =>
      prev.map((o) => {
        if (o.id !== objectiveId) return o;
        const keyResults = o.keyResults.map((kr) => (kr.id === updated.id ? updated : kr));
        const pcts = keyResults.map((kr) =>
          kr.target === 0 ? 0 : Math.min(kr.current / kr.target, 1)
        );
        const progress = Math.round(
          (pcts.reduce((sum, p) => sum + p, 0) / (pcts.length || 1)) * 100
        );
        return { ...o, keyResults, progress };
      })
    );
  }

  function handleObjectiveDeleted(id: string) {
    setObjectives((prev) => prev.filter((o) => o.id !== id));
  }

  function handleBetUpdated(updated: StrategicBet) {
    setBets((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  }

  function handleBetDeleted(id: string) {
    setBets((prev) => prev.filter((b) => b.id !== id));
  }

  if (loading) {
    return (
      <>
        <Topbar eyebrow="Direction" title="Strategic Planning" statusText="Loading…" />
        <main className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-muted" />
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Topbar eyebrow="Direction" title="Strategic Planning" statusText="Error" />
        <main className="flex-1 px-6 lg:px-10 py-8">
          <Panel className="p-6 text-sm text-muted">{error}</Panel>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar
        eyebrow="Direction"
        title="Strategic Planning"
        statusText={`${objectives.length} objective${objectives.length === 1 ? "" : "s"} tracked`}
      />

      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8 space-y-10">

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl">Objectives & Key Results</h2>
            <NewObjectiveForm onCreated={loadAll} />
          </div>

          {objectives.length === 0 ? (
            <Panel className="p-8 text-center">
              <p className="text-sm font-medium mb-1">No objectives yet</p>
              <p className="text-xs text-muted">Create your first objective to start tracking real progress.</p>
            </Panel>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {objectives.map((o) => (
                <ObjectiveCard
                  key={o.id}
                  o={o}
                  onKRUpdated={(updated) => handleKRUpdated(o.id, updated)}
                  onDeleted={handleObjectiveDeleted}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl">Strategic Bets</h2>
            <NewStrategicBetForm onCreated={loadAll} />
          </div>

          {bets.length === 0 ? (
            <Panel className="p-8 text-center">
              <p className="text-sm font-medium mb-1">No strategic bets yet</p>
              <p className="text-xs text-muted">Log the big directional bets you're making and track their status over time.</p>
            </Panel>
          ) : (
            <Panel className="overflow-hidden">
              <div className="divide-y divide-line">
                {bets.map((bet) => (
                  <BetRow key={bet.id} bet={bet} onUpdated={handleBetUpdated} onDeleted={handleBetDeleted} />
                ))}
              </div>
            </Panel>
          )}
        </section>

      </main>
    </>
  );
}