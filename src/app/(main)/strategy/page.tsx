"use client";

import { useState } from "react";
import {
  Target,
  Plus,
  ChevronRight,
  MoreHorizontal,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Trash2,
  Pencil,
  X,
  Save,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type OKRStatus = "on-track" | "at-risk" | "off-track" | "complete";

interface KeyResult {
  id: string;
  text: string;
  progress: number; // 0-100
}

interface OKR {
  id: string;
  objective: string;
  quarter: string;
  status: OKRStatus;
  keyResults: KeyResult[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<
  OKRStatus,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  "on-track": { label: "On track", color: "text-emerald-400", icon: CheckCircle2 },
  "at-risk": { label: "At risk", color: "text-amber-400", icon: AlertCircle },
  "off-track": { label: "Off track", color: "text-rose-400", icon: AlertCircle },
  complete: { label: "Complete", color: "text-sky-400", icon: CheckCircle2 },
};

const QUARTERS = ["Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025", "Q1 2026", "Q2 2026"];

const SEED_OKRS: OKR[] = [
  {
    id: "okr-1",
    objective: "Establish Vela as the primary decision layer for executive ops",
    quarter: "Q2 2025",
    status: "on-track",
    keyResults: [
      { id: "kr-1a", text: "3 enterprise pilots signed and active", progress: 67 },
      { id: "kr-1b", text: "Executive NPS above 72", progress: 80 },
      { id: "kr-1c", text: "Average time-to-decision reduced by 40%", progress: 50 },
    ],
  },
  {
    id: "okr-2",
    objective: "Ship core AI briefing engine to GA",
    quarter: "Q2 2025",
    status: "at-risk",
    keyResults: [
      { id: "kr-2a", text: "Briefing latency under 2s for 95th percentile", progress: 45 },
      { id: "kr-2b", text: "Zero Sev-1 incidents post-launch for 30 days", progress: 0 },
      { id: "kr-2c", text: "Full audit log coverage on all AI outputs", progress: 90 },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function avgProgress(keyResults: KeyResult[]) {
  if (!keyResults.length) return 0;
  return Math.round(keyResults.reduce((s, kr) => s + kr.progress, 0) / keyResults.length);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: OKRStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${meta.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </span>
  );
}

function KeyResultRow({
  kr,
  onChange,
  onDelete,
}: {
  kr: KeyResult;
  onChange: (id: string, field: keyof KeyResult, value: string | number) => void;
  onDelete: (id: string) => void;
}) {
  const barColor =
    kr.progress >= 70
      ? "bg-emerald-400"
      : kr.progress >= 40
      ? "bg-amber-400"
      : "bg-rose-400";

  return (
    <div className="group flex items-start gap-3 py-2">
      <ChevronRight className="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <input
          className="w-full bg-transparent text-sm text-white/80 placeholder-white/30 border-b border-transparent focus:border-white/20 focus:outline-none pb-0.5 transition-colors"
          value={kr.text}
          onChange={(e) => onChange(kr.id, "text", e.target.value)}
          placeholder="Key result…"
        />
        <div className="flex items-center gap-2 mt-1.5">
          <ProgressBar value={kr.progress} color={barColor} />
          <input
            type="number"
            min={0}
            max={100}
            className="w-10 text-xs text-right text-white/50 bg-transparent focus:outline-none focus:text-white/80"
            value={kr.progress}
            onChange={(e) =>
              onChange(kr.id, "progress", Math.min(100, Math.max(0, Number(e.target.value))))
            }
          />
          <span className="text-xs text-white/30">%</span>
        </div>
      </div>
      <button
        onClick={() => onDelete(kr.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-rose-400 mt-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function OKRCard({
  okr,
  onUpdate,
  onDelete,
}: {
  okr: OKR;
  onUpdate: (updated: OKR) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const progress = avgProgress(okr.keyResults);

  function updateKR(id: string, field: keyof KeyResult, value: string | number) {
    onUpdate({
      ...okr,
      keyResults: okr.keyResults.map((kr) => (kr.id === id ? { ...kr, [field]: value } : kr)),
    });
  }

  function addKR() {
    onUpdate({
      ...okr,
      keyResults: [
        ...okr.keyResults,
        { id: uid(), text: "", progress: 0 },
      ],
    });
  }

  function deleteKR(id: string) {
    onUpdate({ ...okr, keyResults: okr.keyResults.filter((kr) => kr.id !== id) });
  }

  return (
    <div className="relative bg-white/[0.04] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-indigo-400"
              value={okr.objective}
              onChange={(e) => onUpdate({ ...okr, objective: e.target.value })}
            />
          ) : (
            <p className="text-sm font-semibold text-white leading-snug">{okr.objective}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-white/40 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {okr.quarter}
            </span>
            <StatusBadge status={okr.status} />
          </div>
        </div>

        <div className="relative flex items-center gap-1 flex-shrink-0">
          {editing ? (
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-400/10 px-2.5 py-1 rounded-lg transition-colors"
            >
              <Save className="w-3 h-3" />
              Done
            </button>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-white/30 hover:text-white/70 p-1 rounded transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="text-white/30 hover:text-white/70 p-1 rounded transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-10 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl py-1 min-w-[140px]">
              {(["on-track", "at-risk", "off-track", "complete"] as OKRStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onUpdate({ ...okr, status: s });
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Mark: {STATUS_META[s].label}
                </button>
              ))}
              <div className="border-t border-white/10 my-1" />
              <button
                onClick={() => {
                  onDelete(okr.id);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-400/10 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-3 h-3" />
                Delete OKR
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Overall progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-white/40 mb-1">
          <span>Overall progress</span>
          <span>{progress}%</span>
        </div>
        <ProgressBar
          value={progress}
          color={progress >= 70 ? "bg-emerald-400" : progress >= 40 ? "bg-amber-400" : "bg-rose-400"}
        />
      </div>

      {/* Key Results */}
      <div className="border-t border-white/10 pt-3 space-y-0.5">
        {okr.keyResults.map((kr) => (
          <KeyResultRow key={kr.id} kr={kr} onChange={updateKR} onDelete={deleteKR} />
        ))}
        <button
          onClick={addKR}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-indigo-400 mt-2 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add key result
        </button>
      </div>
    </div>
  );
}

// ─── New OKR Modal ────────────────────────────────────────────────────────────

function NewOKRModal({ onAdd, onClose }: { onAdd: (okr: OKR) => void; onClose: () => void }) {
  const [objective, setObjective] = useState("");
  const [quarter, setQuarter] = useState("Q2 2025");

  function submit() {
    if (!objective.trim()) return;
    onAdd({
      id: uid(),
      objective: objective.trim(),
      quarter,
      status: "on-track",
      keyResults: [{ id: uid(), text: "", progress: 0 }],
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0f0f1a] border border-white/15 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">New OKR</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Objective</label>
            <textarea
              autoFocus
              rows={3}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-400 resize-none transition-colors"
              placeholder="What do you want to achieve?"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Quarter</label>
            <select
              className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-400 transition-colors"
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
            >
              {QUARTERS.map((q) => (
                <option key={q} value={q} className="bg-[#0f0f1a]">
                  {q}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm text-white/50 border border-white/10 rounded-xl hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!objective.trim()}
            className="flex-1 py-2.5 text-sm text-white bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
          >
            Create OKR
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ okrs }: { okrs: OKR[] }) {
  const total = okrs.length;
  const onTrack = okrs.filter((o) => o.status === "on-track").length;
  const atRisk = okrs.filter((o) => o.status === "at-risk").length;
  const complete = okrs.filter((o) => o.status === "complete").length;
  const overallAvg =
    total > 0 ? Math.round(okrs.reduce((s, o) => s + avgProgress(o.keyResults), 0) / total) : 0;

  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      {[
        { label: "Total OKRs", value: total, sub: "this quarter", color: "text-white" },
        { label: "On track", value: onTrack, sub: `of ${total}`, color: "text-emerald-400" },
        { label: "At risk", value: atRisk, sub: `of ${total}`, color: "text-amber-400" },
        { label: "Avg progress", value: `${overallAvg}%`, sub: "across all", color: "text-indigo-400" },
      ].map((s) => (
        <div
          key={s.label}
          className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3"
        >
          <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          <p className="text-xs text-white/50 mt-0.5">{s.label}</p>
          <p className="text-xs text-white/25">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function StrategyPage() {
  const [okrs, setOkrs] = useState<OKR[]>(SEED_OKRS);
  const [filterStatus, setFilterStatus] = useState<OKRStatus | "all">("all");
  const [filterQuarter, setFilterQuarter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);

  function addOKR(okr: OKR) {
    setOkrs((prev) => [okr, ...prev]);
  }

  function updateOKR(updated: OKR) {
    setOkrs((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  }

  function deleteOKR(id: string) {
    setOkrs((prev) => prev.filter((o) => o.id !== id));
  }

  const filtered = okrs.filter((o) => {
    const statusMatch = filterStatus === "all" || o.status === filterStatus;
    const quarterMatch = filterQuarter === "all" || o.quarter === filterQuarter;
    return statusMatch && quarterMatch;
  });

  const activeQuarters = [...new Set(okrs.map((o) => o.quarter))];

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Page header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <Target className="w-4.5 h-4.5 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Direction</p>
              <h1 className="text-xl font-bold">Strategic Planning</h1>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 text-sm bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-xl font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New OKR
          </button>
        </div>

        {/* Stats */}
        <StatsBar okrs={okrs} />

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <TrendingUp className="w-4 h-4 text-white/30" />
          {(["all", "on-track", "at-risk", "off-track", "complete"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                filterStatus === s
                  ? "border-indigo-400 text-indigo-300 bg-indigo-400/10"
                  : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
              }`}
            >
              {s === "all" ? "All statuses" : STATUS_META[s].label}
            </button>
          ))}
          <div className="w-px h-4 bg-white/10" />
          {["all", ...activeQuarters].map((q) => (
            <button
              key={q}
              onClick={() => setFilterQuarter(q)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                filterQuarter === q
                  ? "border-indigo-400 text-indigo-300 bg-indigo-400/10"
                  : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
              }`}
            >
              {q === "all" ? "All quarters" : q}
            </button>
          ))}
        </div>

        {/* OKR List */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
            <Target className="w-8 h-8 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40">No OKRs match these filters.</p>
            <button
              onClick={() => { setFilterStatus("all"); setFilterQuarter("all"); }}
              className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((okr) => (
              <OKRCard key={okr.id} okr={okr} onUpdate={updateOKR} onDelete={deleteOKR} />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <NewOKRModal onAdd={addOKR} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}