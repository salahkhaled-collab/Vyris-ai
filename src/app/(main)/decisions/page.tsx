import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { decisions } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";

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
              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-2 mb-3">
                <h3 className="font-display text-2xl leading-snug max-w-2xl">{d.title}</h3>
                <span className="text-xs px-3 py-1.5 rounded-full bg-panel-2 text-muted whitespace-nowrap">
                  {d.deadline}
                </span>
              </div>
              <p className="text-sm text-muted leading-relaxed max-w-3xl mb-6">{d.context}</p>

              {/* Options */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {d.options.map((opt, idx) => {
                  const scoreTone =
                    opt.score >= 75 ? "text-signal" :
                      opt.score >= 50 ? "text-brass" : "text-muted";

                  return (
                    <div
                      key={opt.id}
                      className="rounded-xl bg-panel-2 border border-line p-5 flex flex-col gap-3"
                    >
                      {/* Option label + score on same line */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-muted">
                          Option {String.fromCharCode(65 + idx)}
                        </span>
                        <span className={cn("font-mono text-sm font-medium", scoreTone)}>
                          {opt.score}
                        </span>
                      </div>

                      <div className="text-sm font-medium leading-snug">{opt.label}</div>

                      {/* Pros + cons */}
                      <div className="space-y-1.5 text-xs">
                        {opt.pros.map((p, i) => (
                          <div key={i} className="flex gap-2 text-muted">
                            <span className="text-signal shrink-0">+</span>
                            <span>{p}</span>
                          </div>
                        ))}
                        {opt.cons.map((c, i) => (
                          <div key={i} className="flex gap-2 text-muted">
                            <span className="shrink-0">−</span>
                            <span>{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Vyris recommendation */}
              {d.recommendation && (
                <div className="mt-6 flex gap-3 items-start rounded-xl bg-panel-2 border border-line p-4">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-brass pt-0.5 whitespace-nowrap">
                    Vyris recommends
                  </span>
                  <p className="text-sm text-muted leading-relaxed">{d.recommendation}</p>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <button className="px-4 py-2 rounded-lg text-sm font-medium bg-brass text-[#1a140a] hover:opacity-90 transition-opacity">
                  Make decision
                </button>
                <button className="px-4 py-2 rounded-lg text-sm font-medium bg-panel-2 text-muted hover:text-ink-text transition-colors">
                  Request more analysis
                </button>
              </div>
            </Panel>
          ))}
        </section>

        {/* Resolved */}
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