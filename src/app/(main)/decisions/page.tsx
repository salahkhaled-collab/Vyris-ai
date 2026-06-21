import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { decisions } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";

function ScoreBar({ score }: { score: number }) {
  const tone = score >= 75 ? "bg-signal" : score >= 50 ? "bg-brass" : "bg-muted";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-panel-2 overflow-hidden">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${score}%` }} />
      </div>
      <span className="font-mono text-xs text-muted w-8 text-right">{score}</span>
    </div>
  );
}

export default function DecisionsPage() {
  const open = decisions.filter((d) => d.status === "open");
  const decided = decisions.filter((d) => d.status === "decided");

  return (
    <>
      <Topbar
        eyebrow="Direction"
        title="Decision Support"
        statusText={`${open.length} open decisions`}
      />

      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8 space-y-10">
        {/* Open decisions */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Circle className="w-4 h-4 text-brass" strokeWidth={1.75} />
            <h2 className="font-display text-xl">Awaiting Your Call</h2>
          </div>

          {open.map((d) => (
            <Panel key={d.id} className="p-6 lg:p-8">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-2 mb-3">
                <h3 className="font-display text-2xl leading-snug max-w-2xl">{d.title}</h3>
                <span className="text-xs px-3 py-1.5 rounded-full bg-brass-soft text-brass whitespace-nowrap">
                  {d.deadline}
                </span>
              </div>
              <p className="text-sm text-muted leading-relaxed max-w-3xl mb-6">{d.context}</p>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {d.options.map((opt, idx) => (
                  <div
                    key={opt.id}
                    className="rounded-xl bg-panel-2 border border-line p-5 flex flex-col gap-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-mono text-xs text-muted">
                        Option {String.fromCharCode(65 + idx)}
                      </div>
                    </div>
                    <div className="text-sm font-medium leading-snug">{opt.label}</div>

                    <div className="space-y-2 text-xs">
                      {opt.pros.map((p, i) => (
                        <div key={i} className="flex gap-2 text-muted">
                          <span className="text-signal mt-0.5">+</span>
                          <span>{p}</span>
                        </div>
                      ))}
                      {opt.cons.map((c, i) => (
                        <div key={i} className="flex gap-2 text-muted">
                          <span className="text-muted mt-0.5">−</span>
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-auto pt-2">
                      <ScoreBar score={opt.score} />
                    </div>
                  </div>
                ))}
              </div>

              {d.recommendation && (
                <div className="mt-6 flex gap-3 items-start rounded-xl bg-brass-soft/40 border border-brass/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-brass pt-0.5 whitespace-nowrap">
                    Vela recommends
                  </div>
                  <p className="text-sm text-ink-text/90 leading-relaxed">{d.recommendation}</p>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button className="px-4 py-2 rounded-lg text-sm font-medium bg-brass text-[#1a140a]">
                  Make decision
                </button>
                <button className="px-4 py-2 rounded-lg text-sm font-medium bg-panel-2">
                  Request more analysis
                </button>
              </div>
            </Panel>
          ))}
        </section>

        {/* Decided */}
        {decided.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-signal" strokeWidth={1.75} />
              <h2 className="font-display text-xl">Resolved</h2>
            </div>
            {decided.map((d) => (
              <Panel key={d.id} className="p-6 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">{d.title}</div>
                  <div className="text-xs text-muted mt-1">{d.recommendation}</div>
                </div>
                <span className="text-xs px-3 py-1.5 rounded-full bg-panel-2 text-muted whitespace-nowrap">
                  {d.deadline}
                </span>
              </Panel>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
