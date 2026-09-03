"use client";

import { useState } from "react";
import { DictationButton } from "@/components/ui/DictationButton";

type NewOption = { label: string; score: number; pros: string; cons: string };

const emptyOption = (): NewOption => ({ label: "", score: 50, pros: "", cons: "" });

export function NewDecisionForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [deadline, setDeadline] = useState("");
  const [options, setOptions] = useState<NewOption[]>([emptyOption(), emptyOption()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateOption(i: number, patch: Partial<NewOption>) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }

  function reset() {
    setTitle(""); setContext(""); setDeadline("");
    setOptions([emptyOption(), emptyOption()]);
    setError(null);
  }

  async function handleSubmit() {
    if (!title.trim() || !context.trim()) {
      setError("Title and context are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          context,
          deadline,
          options: options
            .filter((o) => o.label.trim())
            .map((o) => ({
              label: o.label,
              score: Number(o.score),
              pros: o.pros.split(",").map((s) => s.trim()).filter(Boolean),
              cons: o.cons.split(",").map((s) => s.trim()).filter(Boolean),
            })),
        }),
      });
      if (!res.ok) throw new Error("Failed to create decision");
      reset();
      setOpen(false);
      onCreated();
    } catch {
      setError("Couldn't save that decision. Try again.");
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
        New decision
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-panel-2 border border-line p-6 space-y-4 mb-6">
      <input
        className="w-full bg-panel rounded-lg px-3 py-2 text-sm border border-line"
        placeholder="Decision title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="relative">
        <textarea
          className="w-full bg-panel rounded-lg px-3 py-2 pr-12 text-sm border border-line resize-none"
          placeholder="Context — what's the situation?"
          rows={3}
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
        <DictationButton
          onTranscript={(text) => setContext((prev) => (prev ? `${prev} ${text}` : text))}
          className="absolute top-2 right-2"
        />
      </div>
      <input
        className="w-full bg-panel rounded-lg px-3 py-2 text-sm border border-line"
        placeholder="Deadline (e.g. Fri, Jul 24)"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
      />

      <div className="space-y-3">
        {options.map((opt, i) => (
          <div key={i} className="grid grid-cols-1 lg:grid-cols-4 gap-2">
            <input
              className="bg-panel rounded-lg px-3 py-2 text-xs border border-line lg:col-span-2"
              placeholder={`Option ${String.fromCharCode(65 + i)} label`}
              value={opt.label}
              onChange={(e) => updateOption(i, { label: e.target.value })}
            />
            <input
              type="number"
              min={0}
              max={100}
              className="bg-panel rounded-lg px-3 py-2 text-xs border border-line"
              placeholder="Score"
              value={opt.score}
              onChange={(e) => updateOption(i, { score: Number(e.target.value) })}
            />
            <input
              className="bg-panel rounded-lg px-3 py-2 text-xs border border-line"
              placeholder="Pros, comma separated"
              value={opt.pros}
              onChange={(e) => updateOption(i, { pros: e.target.value })}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setOptions((prev) => [...prev, emptyOption()])}
          className="text-xs text-muted hover:text-ink-text"
        >
          + Add another option
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-brass text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving…" : "Create decision"}
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