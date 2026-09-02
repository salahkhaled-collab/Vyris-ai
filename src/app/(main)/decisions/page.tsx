"use client";

import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { NewDecisionForm } from "@/components/decisions/NewDecisionForm";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Loader2, Trash2 } from "lucide-react";

type DecisionOption = { id: string; label: string; score: number; pros: string[]; cons: string[] };
type Decision = {
  id: string; title: string; context: string; deadline: string;
  status: "OPEN" | "DECIDED"; recommendation: string | null;
  chosenOptionId: string | null;
  options: DecisionOption[];
};

function DeleteButton({ onConfirm, small }: { onConfirm: () => Promise<void>; small?: boolean }) {
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setDeleting(true);
    try {
      await onConfirm();
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={deleting}
      onBlur={() => setConfirming(false)}
      className={cn(
        "rounded-full transition-colors shrink-0",
        small ? "text-[11px] px-2 py-1" : "text-xs px-2.5 py-1.5",
        confirming ? "bg-red-500/20 text-red-400" : "text-muted hover:text-red-400"
      )}
      title={confirming ? "Click again to confirm" : "Delete this decision"}
    >
      {deleting ? "…" : confirming ? "Confirm?" : <Trash2 className={small ? "w-3 h-3" : "w-3.5 h-3.5"} />}
    </button>
  );
}

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  function loadDecisions() {
    setLoading(true);
    fetch("/api/decisions")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setDecisions)
      .catch(() => setError("Failed to load decisions"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadDecisions();
  }, []);

  async function makeDecision(decisionId: string, optionId: string) {
    setDecidingId(decisionId);
    try {
      const res = await fetch(`/api/decisions/${decisionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chosenOptionId: optionId }),
      });
      if (!res.ok) throw new Error("Failed to save decision");
      const updated = await res.json();
      setDecisions((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } catch (err) {
      setError("Couldn't save that decision. Try again.");
    } finally {
      setDecidingId(null);
    }
  }

  async function deleteDecision(decisionId: string) {
    const res = await fetch(`/api/decisions/${decisionId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    setDecisions((prev) => prev.filter((d) => d.id !== decisionId));
  }

  const open = decisions.filter((d) => d.status === "OPEN");
  const decided = decisions.filter((d) => d.status === "DECIDED");

  if (loading) {
    return (
      <>
        <Topbar eyebrow="Direction" title="Decision Support" statusText="Loading…" />
        <main className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-muted" />
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Topbar eyebrow="Direction" title="Decision Support" statusText="Error" />
        <main className="flex-1 px-6 lg:px-10 py-8">
          <Panel className="p-6 text-sm text-muted">{error}</Panel>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar eyebrow="Direction" title="Decision Support" statusText={`${open.length} open decision${open.length === 1 ? "" : "s"}`} />

      <div className="px-6 lg:px-10 pt-6">
        <NewDecisionForm onCreated={loadDecisions} />
      </div>

      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8 space-y-10">

        {open.length === 0 && decided.length === 0 && (
          <Panel className="p-8 text-center">
            <p className="text-sm font-medium mb-1">No decisions yet</p>
            <p className="text-xs text-muted">When a real decision needs your call, it'll show up here.</p>
          </Panel>
        )}

        {open.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Circle className="w-4 h-4 text-brass" strokeWidth={1.75} />
              <h2 className="font-display text-xl">Awaiting Your Call</h2>
            </div>

            {open.map((d) => (
              <Panel key={d.id} className="p-6 lg:p-8">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-2 mb-3">
                  <h3 className="font-display text-2xl leading-snug max-w-2xl">{d.title}</h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs px-3 py-1.5 rounded-full bg-panel-2 text-muted whitespace-nowrap">
                      {d.deadline}
                    </span>
                    <DeleteButton onConfirm={() => deleteDecision(d.id)} />
                  </div>
                </div>
                <p className="text-sm text-muted leading-relaxed max-w-3xl mb-6">{d.context}</p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {d.options.map((opt, idx) => {
                    const scoreTone = opt.score >= 75 ? "text-signal" : opt.score >= 50 ? "text-brass" : "text-muted";
                    return (
                      <div key={opt.id} className="rounded-xl bg-panel-2 border border-line p-5 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-muted">Option {String.fromCharCode(65 + idx)}</span>
                          <span className={cn("font-mono text-sm font-medium", scoreTone)}>{opt.score}</span>
                        </div>
                        <div className="text-sm font-medium leading-snug">{opt.label}</div>
                        <div className="space-y-1.5 text-xs">
                          {opt.pros.map((p, i) => (
                            <div key={i} className="flex gap-2 text-muted"><span className="text-signal shrink-0">+</span><span>{p}</span></div>
                          ))}
                          {opt.cons.map((c, i) => (
                            <div key={i} className="flex gap-2 text-muted"><span className="shrink-0">−</span><span>{c}</span></div>
                          ))}
                        </div>
                        <button
                          onClick={() => makeDecision(d.id, opt.id)}
                          disabled={decidingId === d.id}
                          className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-brass text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {decidingId === d.id ? "Saving…" : "Choose this option"}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {d.recommendation && (
                  <div className="mt-6 flex gap-3 items-start rounded-xl bg-panel-2 border border-line p-4">
                    <span className="text-[11px] uppercase tracking-[0.18em] text-brass pt-0.5 whitespace-nowrap">Vyris recommends</span>
                    <p className="text-sm text-muted leading-relaxed">{d.recommendation}</p>
                  </div>
                )}
              </Panel>
            ))}
          </section>
        )}

        {decided.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-signal" strokeWidth={1.75} />
              <h2 className="font-display text-xl">Resolved</h2>
            </div>
            {decided.map((d) => (
              <Panel key={d.id} className="p-5 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">{d.title}</div>
                  <div className="text-xs text-muted mt-1">
                    Chose: {d.options.find((o) => o.id === d.chosenOptionId)?.label ?? "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs px-3 py-1.5 rounded-full bg-panel-2 text-muted whitespace-nowrap">{d.deadline}</span>
                  <DeleteButton onConfirm={() => deleteDecision(d.id)} small />
                </div>
              </Panel>
            ))}
          </section>
        )}
      </main>
    </>
  );
}