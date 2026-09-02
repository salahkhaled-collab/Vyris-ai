"use client";

import { useState } from "react";

export function NewStrategicBetForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [signal, setSignal] = useState("");
  const [horizon, setHorizon] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle(""); setSignal(""); setHorizon(""); setError(null);
  }

  async function handleSubmit() {
    if (!title.trim() || !signal.trim() || !horizon.trim()) {
      setError("All fields are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/strategic-bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, signal, horizon }),
      });
      if (!res.ok) throw new Error("Failed to create bet");
      reset();
      setOpen(false);
      onCreated();
    } catch {
      setError("Couldn't save that bet. Try again.");
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
        New bet
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-panel-2 border border-line p-6 space-y-4 mb-6">
      <input
        className="w-full bg-panel rounded-lg px-3 py-2 text-sm border border-line"
        placeholder="Bet title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="w-full bg-panel rounded-lg px-3 py-2 text-sm border border-line"
        placeholder="Signal — what evidence supports or challenges this bet?"
        rows={2}
        value={signal}
        onChange={(e) => setSignal(e.target.value)}
      />
      <input
        className="w-full bg-panel rounded-lg px-3 py-2 text-sm border border-line"
        placeholder="Horizon (e.g. 6 months)"
        value={horizon}
        onChange={(e) => setHorizon(e.target.value)}
      />

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-brass text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving…" : "Create bet"}
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