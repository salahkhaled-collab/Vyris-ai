"use client";

import { useState } from "react";

type NewKR = { label: string; current: string; target: string; unit: string };

const emptyKR = (): NewKR => ({ label: "", current: "0", target: "", unit: "" });

export function NewObjectiveForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [quarter, setQuarter] = useState("");
  const [krs, setKrs] = useState<NewKR[]>([emptyKR()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateKR(i: number, patch: Partial<NewKR>) {
    setKrs((prev) => prev.map((kr, idx) => (idx === i ? { ...kr, ...patch } : kr)));
  }

  function reset() {
    setTitle(""); setQuarter(""); setKrs([emptyKR()]); setError(null);
  }

  async function handleSubmit() {
    if (!title.trim() || !quarter.trim()) {
      setError("Title and quarter are required.");
      return;
    }
    const validKrs = krs.filter((k) => k.label.trim() && k.target.trim());
    if (validKrs.length === 0) {
      setError("Add at least one key result with a label and target.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          quarter,
          keyResults: validKrs.map((k) => ({
            label: k.label,
            current: Number(k.current) || 0,
            target: Number(k.target),
            unit: k.unit,
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to create objective");
      reset();
      setOpen(false);
      onCreated();
    } catch {
      setError("Couldn't save that objective. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-brass text-white hover:opacity-90 transition-opacity"
      >
        New objective
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-panel-2 border border-line p-6 space-y-4 mb-6">
      <input
        className="w-full bg-panel rounded-lg px-3 py-2 text-sm border border-line"
        placeholder="Objective title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className="w-full bg-panel rounded-lg px-3 py-2 text-sm border border-line"
        placeholder="Quarter (e.g. Q3 2026)"
        value={quarter}
        onChange={(e) => setQuarter(e.target.value)}
      />

      <div className="space-y-3">
        {krs.map((kr, i) => (
          <div key={i} className="grid grid-cols-1 lg:grid-cols-4 gap-2">
            <input
              className="bg-panel rounded-lg px-3 py-2 text-xs border border-line lg:col-span-2"
              placeholder="Key result label"
              value={kr.label}
              onChange={(e) => updateKR(i, { label: e.target.value })}
            />
            <input
              type="number"
              className="bg-panel rounded-lg px-3 py-2 text-xs border border-line"
              placeholder="Target"
              value={kr.target}
              onChange={(e) => updateKR(i, { target: e.target.value })}
            />
            <input
              className="bg-panel rounded-lg px-3 py-2 text-xs border border-line"
              placeholder="Unit (e.g. %, optional)"
              value={kr.unit}
              onChange={(e) => updateKR(i, { unit: e.target.value })}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setKrs((prev) => [...prev, emptyKR()])}
          className="text-xs text-muted hover:text-ink-text"
        >
          + Add another key result
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-brass text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving…" : "Create objective"}
        </button>
        <button
          onClick={() => { setOpen(false); reset(); }}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-panel text-muted hover:text-ink-text transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}