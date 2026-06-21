import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { LucideIcon } from "lucide-react";

interface PlaceholderPageProps {
  eyebrow: string;
  title: string;
  icon: LucideIcon;
  suggestions: string[];
}

export function PlaceholderPage({ eyebrow, title, icon: Icon, suggestions }: PlaceholderPageProps) {
  return (
    <>
      <Topbar eyebrow={eyebrow} title={title} />
      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8">
        <Panel className="p-10 text-center max-w-xl mx-auto">
          <Icon className="w-8 h-8 text-muted mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="font-display text-xl mb-2">Not yet defined</h2>
          <p className="text-sm text-muted leading-relaxed mb-6">
            This page exists in the navigation but doesn&apos;t have real content yet —
            building it now would mean inventing filler rather than something you&apos;d
            actually use. Tell Vela what should live here and it'll get built for real.
          </p>
          <div className="text-left bg-panel-2 rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted mb-2">
              Possible directions
            </div>
            <ul className="space-y-1.5 text-sm text-ink-text/80">
              {suggestions.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-brass">·</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </main>
    </>
  );
}
